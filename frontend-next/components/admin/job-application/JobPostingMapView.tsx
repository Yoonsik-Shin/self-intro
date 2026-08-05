'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Home,
    Clock,
    Navigation,
    Search,
    ExternalLink,
    Building2,
    Briefcase,
    DollarSign,
    Layers,
    Eye,
    EyeOff,
    Compass,
    Radio,
    Sparkles,
    Loader2,
    Sun,
    Moon,
    ChevronRight,
    ChevronLeft,
    ArrowLeft,
    ListFilter,
    MapPin,
    Calendar,
} from 'lucide-react';
import type { JobPosting, JobPostingSetting } from '@/lib/api/types';
import {
    estimateCommuteTime,
    getKakaoDirectionsUrl,
    getNaverDirectionsUrl,
    CommuteEstimate,
} from '@/lib/utils/commuteCalculator';
import HomeLocationModal from './HomeLocationModal';

interface JobPostingMapViewProps {
    postings: JobPosting[];
    settings: JobPostingSetting | null;
    onUpdateSettings: (settings: JobPostingSetting) => void;
    onSelectPosting: (posting: JobPosting) => void;
}

type TimeFilterOption = 'ALL' | '30' | '45' | '60' | 'OVER_60';
type TileStyleOption = 'LIGHT' | 'DARK';

const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

function loadLeafletAssets(): Promise<unknown> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            reject(new Error('Window is undefined'));
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).L) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            resolve((window as any).L);
            return;
        }

        if (!document.querySelector(`link[href="${LEAFLET_CSS_URL}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = LEAFLET_CSS_URL;
            document.head.appendChild(link);
        }

        const existingScript = document.querySelector(`script[src="${LEAFLET_JS_URL}"]`);
        if (existingScript) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            existingScript.addEventListener('load', () => resolve((window as any).L));
            existingScript.addEventListener('error', (e) => reject(e));
            return;
        }

        const script = document.createElement('script');
        script.src = LEAFLET_JS_URL;
        script.async = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        script.onload = () => resolve((window as any).L);
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
    });
}

/**
 * 🎯 Status 한글 뱃지 변환기
 */
function formatPostingStatus(status: string): { label: string; style: string } {
    switch (status) {
        case 'APPLIED':
        case 'SUPPORTED':
            return {
                label: '지원 완료',
                style: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            };
        case 'DISMISSED':
        case 'CLOSED':
            return { label: '공고 마감', style: 'bg-slate-100 text-slate-600 border-slate-200' };
        case 'IN_PROGRESS':
            return {
                label: '전형 진행 중',
                style: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            };
        case 'BOOKMARKED':
            return { label: '관심 공고', style: 'bg-amber-50 text-amber-700 border-amber-200' };
        default:
            return { label: '채용 중', style: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
}

/**
 * 🎯 100% 신뢰 DB 위도/경도 매퍼 (DB 정밀 좌표 우선 적용)
 */
function resolvePrecisionCoordinates(posting: JobPosting): { lat: number; lng: number } {
    if (posting.latitude && posting.longitude) {
        return { lat: posting.latitude, lng: posting.longitude };
    }
    // 기본 테헤란로 fallback
    return { lat: 37.5006, lng: 127.0365 };
}

export default function JobPostingMapView({
    postings,
    settings,
    onUpdateSettings,
    onSelectPosting,
}: JobPostingMapViewProps) {
    const [isHomeModalOpen, setIsHomeModalOpen] = useState(false);
    const [timeFilter, setTimeFilter] = useState<TimeFilterOption>('ALL');
    const [tileStyle, setTileStyle] = useState<TileStyleOption>('LIGHT');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPostingId, setSelectedPostingId] = useState<number | null>(null);
    const [isMapLoading, setIsMapLoading] = useState(true);
    const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(12);

    // 🎯 현재 지도 화면 범위(Viewport Bounds) 내에 있는 공고 ID 목록 (동적 실시간 필터링)
    const [visibleInMapPostingIds, setVisibleInMapPostingIds] = useState<Set<number> | null>(null);

    // 📱 패널 폭 (컴팩트 300px 로 설정하여 패딩을 살리면서 슬림하게 조절) 및 접기 상태 관리
    const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(true);
    const [detailPanelWidth, setDetailPanelWidth] = useState(300);
    const [isResizing, setIsResizing] = useState(false);
    const splitContainerRef = useRef<HTMLDivElement>(null);

    // 마인드맵 스타일 특정 요소 껐다 켰다(Toggle) 레이어 상태
    const [layerToggles, setLayerToggles] = useState({
        showHomePin: true,
        showDistanceRings: true,
        showPinLabels: true,
    });

    // 마인드맵 레이어 토글 팝업 (기본 닫힘)
    const [isLayerControlOpen, setIsLayerControlOpen] = useState(false);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInstanceRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tileLayerRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markersGroupRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ringsGroupRef = useRef<any>(null);

    // 기본 집 위치
    const homeLat = settings?.homeLatitude ?? 37.5796;
    const homeLng = settings?.homeLongitude ?? 126.8899;
    const homeAddress = settings?.homeAddress || '서울 마포구 월드컵북로 400 (기본)';

    // 공고별 정밀 위도/경도 계산 및 예상 출퇴근 시간 매핑
    const postingsWithCommute = useMemo(() => {
        return postings.map((posting) => {
            let estimate: CommuteEstimate | null = null;

            const coords = resolvePrecisionCoordinates(posting);
            const lat = coords.lat;
            const lng = coords.lng;

            estimate = estimateCommuteTime(homeLat, homeLng, lat, lng);

            return {
                posting,
                lat,
                lng,
                estimate,
            };
        });
    }, [postings, homeLat, homeLng]);

    // 검색 및 소요시간 필터링 적용
    const filteredItems = useMemo(() => {
        return postingsWithCommute.filter(({ posting, estimate }) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchCompany = posting.companyName.toLowerCase().includes(q);
                const matchTitle = posting.positionTitle.toLowerCase().includes(q);
                const matchLoc = (posting.location || '').toLowerCase().includes(q);
                if (!matchCompany && !matchTitle && !matchLoc) return false;
            }

            if (timeFilter === 'ALL') return true;
            if (!estimate) return false;

            const mins = estimate.estimatedMinutes;
            if (timeFilter === '30') return mins <= 30;
            if (timeFilter === '45') return mins <= 45;
            if (timeFilter === '60') return mins <= 60;
            if (timeFilter === 'OVER_60') return mins > 60;

            return true;
        });
    }, [postingsWithCommute, searchQuery, timeFilter]);

    // 🎯 [실시간 지도 화면 연동] 현재 화면 범위 안에 조망되고 있는 공고만 필터링!
    const visibleInViewportItems = useMemo(() => {
        if (!visibleInMapPostingIds) return filteredItems;
        return filteredItems.filter((item) => visibleInMapPostingIds.has(item.posting.id));
    }, [filteredItems, visibleInMapPostingIds]);

    // 🎯 지도 마커 표출 아이템: 선택된 공고가 있을 때(`selectedPostingId !== null`)는 해당 선택 공고 1개만 지도에 표출!
    const mapItemsToRender = useMemo(() => {
        if (selectedPostingId !== null) {
            return filteredItems.filter((item) => item.posting.id === selectedPostingId);
        }
        return filteredItems;
    }, [filteredItems, selectedPostingId]);

    // 현재 선택된 공고 객체 (없으면 null)
    const activeItem = useMemo(() => {
        if (!selectedPostingId) return null;
        return filteredItems.find((i) => i.posting.id === selectedPostingId) || null;
    }, [filteredItems, selectedPostingId]);

    const toggleLayer = (key: keyof typeof layerToggles) => {
        setLayerToggles((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    // 📍 특정 공고 선택 및 지도 위치로 이동 (현재 보고 있는 줌 배율 100% 보존 유지)
    const handleSelectPostingAndPan = (item: (typeof filteredItems)[0]) => {
        setSelectedPostingId(item.posting.id);
        setIsDetailPanelOpen(true);

        if (mapInstanceRef.current && item.lat && item.lng) {
            const currentZoom = mapInstanceRef.current.getZoom();
            mapInstanceRef.current.setView([item.lat, item.lng], currentZoom, {
                animate: true,
            });
        }
    };

    // ↔️ 패널 드래그앤드롭 리사이저 이벤트 핸들러
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !splitContainerRef.current) return;
            const containerRect = splitContainerRef.current.getBoundingClientRect();
            const newWidth = containerRect.right - e.clientX;
            if (newWidth >= 240 && newWidth <= 600) {
                setDetailPanelWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // 🗺️ Leaflet 지도 인스턴스 초기화 및 바운즈 기반 실시간 노출 목록 동기화
    useEffect(() => {
        if (!mapContainerRef.current) return;

        let isMounted = true;

        const initLeafletMap = async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const L: any = await loadLeafletAssets();

                if (!isMounted || !mapContainerRef.current) return;

                setIsMapLoading(false);

                const tileUrl =
                    tileStyle === 'LIGHT'
                        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
                        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

                const attribution =
                    '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap';

                if (!mapInstanceRef.current) {
                    const map = L.map(mapContainerRef.current, {
                        center: [homeLat, homeLng],
                        zoom: 12,
                        zoomControl: false,
                    });

                    L.control.zoom({ position: 'bottomright' }).addTo(map);

                    tileLayerRef.current = L.tileLayer(tileUrl, {
                        attribution,
                        maxZoom: 19,
                    }).addTo(map);

                    markersGroupRef.current = L.layerGroup().addTo(map);
                    ringsGroupRef.current = L.layerGroup().addTo(map);

                    // 🎯 지도 화면 이동/확대축소 시 실시간 화면 범위 내 공고 추출 갱신 함수
                    const updateVisiblePostingIds = () => {
                        const bounds = map.getBounds();
                        const visibleSet = new Set<number>();

                        filteredItems.forEach((item) => {
                            if (item.lat && item.lng && bounds.contains([item.lat, item.lng])) {
                                visibleSet.add(item.posting.id);
                            }
                        });

                        setVisibleInMapPostingIds(visibleSet);
                        setCurrentZoomLevel(map.getZoom());
                    };

                    map.on('zoomend moveend dragend', updateVisiblePostingIds);

                    mapInstanceRef.current = map;

                    // 최초 렌더링 시 바운즈 계산
                    setTimeout(updateVisiblePostingIds, 200);
                } else {
                    const map = mapInstanceRef.current;
                    if (tileLayerRef.current) {
                        map.removeLayer(tileLayerRef.current);
                    }
                    tileLayerRef.current = L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(
                        map
                    );
                    setTimeout(() => map.invalidateSize(), 150);
                }

                renderMapLayers(L);
            } catch (err) {
                console.error('Leaflet initialization failed:', err);
            }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderMapLayers = (L: any) => {
            const map = mapInstanceRef.current;
            const markersGroup = markersGroupRef.current;
            const ringsGroup = ringsGroupRef.current;

            if (!map || !markersGroup || !ringsGroup) return;

            markersGroup.clearLayers();
            ringsGroup.clearLayers();

            const zoom = map.getZoom();

            // 🎯 1. 반경 동심원 (10km, 20km, 30km)
            if (layerToggles.showDistanceRings) {
                L.circle([homeLat, homeLng], {
                    radius: 10000,
                    color: tileStyle === 'LIGHT' ? '#059669' : '#10b981',
                    weight: 1.8,
                    dashArray: '5, 5',
                    fillOpacity: 0.04,
                }).addTo(ringsGroup);

                L.circle([homeLat, homeLng], {
                    radius: 20000,
                    color: tileStyle === 'LIGHT' ? '#4f46e5' : '#6366f1',
                    weight: 1.8,
                    dashArray: '5, 5',
                    fillOpacity: 0.03,
                }).addTo(ringsGroup);

                L.circle([homeLat, homeLng], {
                    radius: 30000,
                    color: tileStyle === 'LIGHT' ? '#d97706' : '#f59e0b',
                    weight: 1.8,
                    dashArray: '5, 5',
                    fillOpacity: 0.02,
                }).addTo(ringsGroup);
            }

            // 🏠 2. 내 집 위치 마커 (Home Marker)
            if (layerToggles.showHomePin) {
                const homeIcon = L.divIcon({
                    className: 'custom-home-icon',
                    html: `
                        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                            <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(15, 23, 42, 0.25); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                            <div style="position: relative; width: 34px; height: 34px; border-radius: 50%; background: #0f172a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.6); border: 2px solid #ffffff;">
                                🏠
                            </div>
                            <div style="margin-top: 4px; background: #0f172a; border: 1.5px solid #334155; color: #ffffff; padding: 3px 10px; border-radius: 10px; font-size: 11px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.18);">
                                🏠 내 집 출발점
                            </div>
                        </div>
                    `,
                    iconSize: [140, 65],
                    iconAnchor: [70, 32],
                });

                const homeMarker = L.marker([homeLat, homeLng], { icon: homeIcon }).addTo(
                    markersGroup
                );
                homeMarker.on('click', () => setIsHomeModalOpen(true));
            }

            // 🎯 스마트 줌 수준에 따른 동적 군집화 (Clustering Thresholds)
            // Zoom < 14: 넓은 픽셀 거리(75px)로 뭉침
            // Zoom 14 ~ 15: 중간 픽셀 거리(45px)로 뭉침
            // Zoom >= 16 또는 단일 공고 선택 모드: 100% 핀 분리
            const isDetailedZoom = zoom >= 16 || selectedPostingId !== null;

            let pixelThreshold = 0;
            if (!isDetailedZoom) {
                if (zoom < 13) {
                    pixelThreshold = 80;
                } else if (zoom < 15) {
                    pixelThreshold = 55;
                } else {
                    pixelThreshold = 35;
                }
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clusters: {
                centerLat: number;
                centerLng: number;
                items: typeof mapItemsToRender;
            }[] = [];

            mapItemsToRender.forEach((item) => {
                if (!item.lat || !item.lng) return;

                if (!isDetailedZoom && pixelThreshold > 0) {
                    const itemPoint = map.latLngToLayerPoint([item.lat, item.lng]);

                    let addedToCluster = false;
                    for (const cluster of clusters) {
                        const clusterPoint = map.latLngToLayerPoint([
                            cluster.centerLat,
                            cluster.centerLng,
                        ]);
                        const distance = Math.hypot(
                            itemPoint.x - clusterPoint.x,
                            itemPoint.y - clusterPoint.y
                        );

                        if (distance <= pixelThreshold) {
                            cluster.items.push(item);
                            cluster.centerLat =
                                cluster.items.reduce((sum, i) => sum + i.lat!, 0) /
                                cluster.items.length;
                            cluster.centerLng =
                                cluster.items.reduce((sum, i) => sum + i.lng!, 0) /
                                cluster.items.length;
                            addedToCluster = true;
                            break;
                        }
                    }

                    if (!addedToCluster) {
                        clusters.push({
                            centerLat: item.lat,
                            centerLng: item.lng,
                            items: [item],
                        });
                    }
                } else {
                    clusters.push({
                        centerLat: item.lat,
                        centerLng: item.lng,
                        items: [item],
                    });
                }
            });

            const renderList: {
                item: (typeof mapItemsToRender)[0];
                drawLat: number;
                drawLng: number;
            }[] = [];

            const sameCoordsMap: Record<string, typeof mapItemsToRender> = {};
            mapItemsToRender.forEach((item) => {
                if (!item.lat || !item.lng) return;
                const key = `${item.lat.toFixed(5)}_${item.lng.toFixed(5)}`;
                if (!sameCoordsMap[key]) sameCoordsMap[key] = [];
                sameCoordsMap[key].push(item);
            });

            clusters.forEach((cluster) => {
                const count = cluster.items.length;

                if (count > 1 && !isDetailedZoom) {
                    let clusterBg = '#10b981';
                    let clusterBorder = '#047857';

                    if (count >= 20) {
                        clusterBg = '#8b5cf6';
                        clusterBorder = '#6d28d9';
                    } else if (count >= 10) {
                        clusterBg = '#6366f1';
                        clusterBorder = '#4338ca';
                    }

                    const clusterIcon = L.divIcon({
                        className: 'custom-cluster-icon',
                        html: `
                            <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s;">
                                <div style="position: absolute; width: 48px; height: 48px; border-radius: 50%; background: ${clusterBg}44; animation: pulse 2s infinite;"></div>
                                <div style="position: relative; width: 40px; height: 40px; border-radius: 50%; background: ${clusterBg}; border: 3px solid #ffffff; color: #ffffff; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 900; font-size: 14px; box-shadow: 0 6px 16px ${clusterBg}88;">
                                    ${count}
                                </div>
                                <div style="margin-top: 3px; background: #ffffff; border: 1.5px solid ${clusterBorder}; color: ${clusterBorder}; padding: 2px 8px; border-radius: 8px; font-size: 10px; font-weight: 800; white-space: nowrap; box-shadow: 0 3px 10px rgba(0,0,0,0.15);">
                                    🏢 ${count}개 공고 뭉침 (클릭 시 확대 분리)
                                </div>
                            </div>
                        `,
                        iconSize: [140, 65],
                        iconAnchor: [70, 32],
                    });

                    const clusterMarker = L.marker([cluster.centerLat, cluster.centerLng], {
                        icon: clusterIcon,
                    }).addTo(markersGroup);

                    clusterMarker.on('click', () => {
                        const targetZoom = Math.min(17, map.getZoom() + 2);
                        map.setView([cluster.centerLat, cluster.centerLng], targetZoom, {
                            animate: true,
                        });
                        setIsDetailPanelOpen(true);
                    });
                } else {
                    cluster.items.forEach((item) => {
                        if (!item.lat || !item.lng) return;
                        const key = `${item.lat.toFixed(5)}_${item.lng.toFixed(5)}`;
                        const sameGroup = sameCoordsMap[key] || [item];
                        const index = sameGroup.indexOf(item);

                        let drawLat = item.lat;
                        let drawLng = item.lng;

                        if (sameGroup.length > 1) {
                            const angle = (index / sameGroup.length) * 2 * Math.PI;
                            const radiusMult = Math.min(1.8, 1 + Math.floor(index / 12) * 0.5);
                            const offsetDist = 0.0012 * radiusMult;
                            drawLat += Math.sin(angle) * offsetDist;
                            drawLng += Math.cos(angle) * offsetDist;
                        }

                        renderList.push({ item, drawLat, drawLng });
                    });
                }
            });

            renderList.forEach(({ item, drawLat, drawLng }) => {
                const isSelected = activeItem?.posting.id === item.posting.id;
                const mins = item.estimate?.estimatedMinutes || 0;

                let colorHex = '#10b981';
                let textHex = '#047857';
                if (mins > 60) {
                    colorHex = '#f43f5e';
                    textHex = '#be123c';
                } else if (mins > 45) {
                    colorHex = '#f59e0b';
                    textHex = '#b45309';
                } else if (mins > 30) {
                    colorHex = '#6366f1';
                    textHex = '#4338ca';
                }

                const labelHtml = layerToggles.showPinLabels
                    ? `<div style="margin-top: 3px; background: #ffffff; border: 1.5px solid ${colorHex}; color: ${textHex}; padding: 2.5px 8px; border-radius: 8px; font-size: 10px; font-weight: 800; white-space: nowrap; box-shadow: 0 3px 10px rgba(0,0,0,0.12); pointer-events: none;">
                        ${item.posting.companyName} ${item.estimate?.formattedTimeText ? `(${item.estimate.formattedTimeText})` : ''}
                       </div>`
                    : '';

                const selectedRingHtml = isSelected
                    ? `<div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: ${colorHex}55; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
                    : '';

                const customPinIcon = L.divIcon({
                    className: 'custom-posting-pin',
                    html: `
                        <div className="pin-wrapper" style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: all 0.2s; ${isSelected ? 'transform: scale(1.3); z-index: 99999;' : ''}">
                            ${selectedRingHtml}
                            <div style="position: relative; width: 28px; height: 28px; border-radius: 50%; background: ${colorHex}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 4px 12px ${colorHex}66; border: 2px solid #ffffff;">
                                📍
                            </div>
                            ${labelHtml}
                        </div>
                    `,
                    iconSize: [140, 55],
                    iconAnchor: [70, 27],
                });

                const postingMarker = L.marker([drawLat, drawLng], {
                    icon: customPinIcon,
                    zIndexOffset: isSelected ? 1000 : 0,
                }).addTo(markersGroup);

                postingMarker.on('click', () => {
                    handleSelectPostingAndPan(item);
                });
            });
        };

        initLeafletMap();

        return () => {
            isMounted = false;
        };
    }, [
        homeLat,
        homeLng,
        mapItemsToRender,
        activeItem,
        layerToggles,
        tileStyle,
        currentZoomLevel,
        selectedPostingId,
        filteredItems,
    ]);

    useEffect(() => {
        if (mapInstanceRef.current) {
            setTimeout(() => {
                mapInstanceRef.current.invalidateSize();
            }, 100);
        }
    }, [isDetailPanelOpen, detailPanelWidth]);

    return (
        <div className="flex flex-col h-[calc(100vh-7rem)] min-h-[750px] rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xl text-slate-800">
            {/* 1. 상단 툴바 */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/90 p-3.5 backdrop-blur-md">
                {/* [왼쪽 그룹] 출퇴근 소요시간 필터 탭 + 검색창 */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* 출퇴근 소요시간 필터 탭 */}
                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
                        <button
                            onClick={() => setTimeFilter('ALL')}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                timeFilter === 'ALL'
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                        >
                            전체
                        </button>
                        <button
                            onClick={() => setTimeFilter('30')}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                timeFilter === '30'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                        >
                            ⚡ 30분 이내
                        </button>
                        <button
                            onClick={() => setTimeFilter('45')}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                timeFilter === '45'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                        >
                            ⚡ 45분 이내
                        </button>
                        <button
                            onClick={() => setTimeFilter('60')}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                timeFilter === '60'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                        >
                            ⚡ 60분 이내
                        </button>
                    </div>

                    {/* 공고 검색창 */}
                    <div className="relative min-w-[210px]">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="회사명 또는 지역 검색..."
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 pl-9 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none shadow-2xs transition-all"
                        />
                        <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
                    </div>
                </div>

                {/* [오른쪽 그룹] 기준 집 위치 버튼 */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsHomeModalOpen(true)}
                        className="group flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-sm"
                    >
                        <Home className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span className="max-w-[220px] truncate text-slate-100">{homeAddress}</span>
                        <span className="rounded-md bg-slate-700/80 px-1.5 py-0.5 text-[10px] text-slate-200 font-semibold group-hover:bg-slate-600">
                            도로명 검색/변경
                        </span>
                    </button>
                </div>
            </div>

            {/* 2. 메인 대시보드 뷰어 */}
            <div
                ref={splitContainerRef}
                className="flex flex-1 overflow-hidden relative bg-slate-100"
            >
                {/* 지도 시각화 캔버스 (Left area) */}
                <div className="relative flex-1 bg-slate-100 overflow-hidden flex flex-col items-center justify-center p-3">
                    {/* Interactive Leaflet Real Map Tile Canvas */}
                    <div className="relative w-full h-full rounded-xl border border-slate-200 bg-white flex flex-col justify-between overflow-hidden shadow-xs">
                        {/* 지도 상단 마인드맵 토글 패널 및 지도 타일 스타일 변경 바 */}
                        <div className="absolute top-4 left-4 right-4 z-20 flex items-start justify-between pointer-events-none">
                            {/* 지도 타일 스위처 */}
                            <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl bg-white/95 border border-slate-200 p-1 backdrop-blur-md shadow-md text-xs">
                                <button
                                    onClick={() => setTileStyle('LIGHT')}
                                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                                        tileStyle === 'LIGHT'
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                >
                                    <Sun className="h-3 w-3 text-amber-300" />
                                    <span>☀️ 밝은 지도 (추천)</span>
                                </button>
                                <button
                                    onClick={() => setTileStyle('DARK')}
                                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                                        tileStyle === 'DARK'
                                            ? 'bg-slate-900 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                >
                                    <Moon className="h-3 w-3 text-indigo-400" />
                                    <span>🌙 다크 지도</span>
                                </button>
                            </div>

                            {/* 🧠 마인드맵 스타일 특정 요소 껐다 켰다(Toggle) 컨트롤 패널 */}
                            <div className="relative ml-auto pointer-events-auto">
                                <button
                                    onClick={() => setIsLayerControlOpen(!isLayerControlOpen)}
                                    className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 backdrop-blur-md transition-all shadow-md"
                                >
                                    <Layers className="h-3.5 w-3.5 text-indigo-100" />
                                    <span>마인드맵 레이어 토글</span>
                                    <span className="rounded bg-white/20 px-1 text-[10px]">
                                        {Object.values(layerToggles).filter(Boolean).length}/3
                                    </span>
                                </button>

                                {isLayerControlOpen && (
                                    <div className="absolute right-0 top-9 w-64 rounded-2xl border border-slate-200 bg-white/95 p-3.5 backdrop-blur-xl shadow-xl space-y-2 z-30 animate-in fade-in slide-in-from-top-2 duration-150 text-xs text-slate-800">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-[11px] font-bold text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                                지도 요소 켜기/끄기
                                            </span>
                                            <span>토글 컨트롤</span>
                                        </div>

                                        {/* 1. 내 집 마커 토글 */}
                                        <button
                                            onClick={() => toggleLayer('showHomePin')}
                                            className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors ${
                                                layerToggles.showHomePin
                                                    ? 'bg-slate-900 text-white font-bold border border-slate-800'
                                                    : 'bg-slate-100 text-slate-400'
                                            }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <Home className="h-3.5 w-3.5 text-emerald-400" />
                                                기준 내 집 마커
                                            </span>
                                            {layerToggles.showHomePin ? (
                                                <Eye className="h-3.5 w-3.5 text-emerald-400" />
                                            ) : (
                                                <EyeOff className="h-3.5 w-3.5" />
                                            )}
                                        </button>

                                        {/* 2. 직주근접 반경 링 토글 */}
                                        <button
                                            onClick={() => toggleLayer('showDistanceRings')}
                                            className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors ${
                                                layerToggles.showDistanceRings
                                                    ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200'
                                                    : 'bg-slate-100 text-slate-400'
                                            }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <Compass className="h-3.5 w-3.5" />
                                                🎯 반경 동심원 (10/20/30km)
                                            </span>
                                            {layerToggles.showDistanceRings ? (
                                                <Eye className="h-3.5 w-3.5 text-amber-600" />
                                            ) : (
                                                <EyeOff className="h-3.5 w-3.5" />
                                            )}
                                        </button>

                                        {/* 3. 마커 뱃지 라벨 토글 */}
                                        <button
                                            onClick={() => toggleLayer('showPinLabels')}
                                            className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors ${
                                                layerToggles.showPinLabels
                                                    ? 'bg-purple-50 text-purple-900 font-bold border border-purple-200'
                                                    : 'bg-slate-100 text-slate-400'
                                            }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <Radio className="h-3.5 w-3.5" />
                                                🏷️ 마커 뱃지 라벨 보기
                                            </span>
                                            {layerToggles.showPinLabels ? (
                                                <Eye className="h-3.5 w-3.5 text-purple-600" />
                                            ) : (
                                                <EyeOff className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 🗺️ Leaflet Map Canvas */}
                        <div className="relative w-full h-full min-h-[450px] bg-slate-100">
                            {isMapLoading && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white text-xs font-semibold text-indigo-600">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    <span>실제 타일 지도를 로드하고 있습니다...</span>
                                </div>
                            )}
                            <div
                                ref={mapContainerRef}
                                className="w-full h-full min-h-[450px] z-0 rounded-xl overflow-hidden"
                            />

                            {/* 📱 패널 접힘 시 우측 오버레이 열기 탭 버튼 */}
                            {!isDetailPanelOpen && (
                                <button
                                    onClick={() => setIsDetailPanelOpen(true)}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center rounded-l-xl border border-r-0 border-slate-200 bg-white/95 p-2.5 text-slate-700 shadow-md hover:bg-slate-100 hover:text-indigo-600 backdrop-blur-md transition-all animate-in fade-in slide-in-from-right duration-200 group"
                                    title="패널 열기"
                                >
                                    <ChevronLeft className="h-5 w-5 text-indigo-600 group-hover:-translate-x-0.5 transition-transform" />
                                </button>
                            )}
                        </div>

                        {/* 지도 정보 가이드 하단 바 */}
                        <div className="z-20 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 p-3 bg-white/95 backdrop-blur-md text-[11px] text-slate-700 font-bold">
                            <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-indigo-600" />
                                {selectedPostingId !== null ? (
                                    <>
                                        선택된 공고{' '}
                                        <strong className="text-indigo-600 font-extrabold">
                                            1개
                                        </strong>{' '}
                                        정밀 핀 렌더링 중 (
                                        <button
                                            onClick={() => setSelectedPostingId(null)}
                                            className="underline hover:text-indigo-800"
                                        >
                                            전체 보기로 복귀
                                        </button>
                                        )
                                    </>
                                ) : (
                                    <>
                                        현재 지도 범위 내{' '}
                                        <strong className="text-indigo-600 font-extrabold">
                                            {visibleInViewportItems.length}개
                                        </strong>{' '}
                                        (전체 {filteredItems.length}개) 표기 중
                                    </>
                                )}
                            </span>
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> 30분
                                    이내
                                </span>
                                <span className="flex items-center gap-1 text-indigo-700 font-bold">
                                    <span className="h-2 w-2 rounded-full bg-indigo-500" /> 45분
                                    이내
                                </span>
                                <span className="flex items-center gap-1 text-amber-700 font-bold">
                                    <span className="h-2 w-2 rounded-full bg-amber-500" /> 60분 이내
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ↔️ [슬림 구분선 & 오버레이 접기 탭] */}
                {isDetailPanelOpen && (
                    <div
                        onMouseDown={handleMouseDown}
                        className={`w-1 hover:w-1.5 bg-slate-200 hover:bg-indigo-500 cursor-col-resize flex items-center justify-center transition-all z-20 relative group ${
                            isResizing ? 'bg-indigo-600 w-1.5' : ''
                        }`}
                        title="좌우 드래그하여 패널 너비 조절"
                    >
                        <button
                            onClick={() => setIsDetailPanelOpen(false)}
                            className="absolute -left-3 top-1/2 -translate-y-1/2 z-30 flex h-7 w-6 items-center justify-center rounded-l-md border border-r-0 border-slate-200 bg-white/95 text-slate-500 shadow-sm hover:bg-slate-100 hover:text-indigo-600 backdrop-blur-md transition-all"
                            title="패널 접기"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* 3. 🎯 [실시간 지도 화면 연동] 현재 지도 화면 안 범위의 공고만 연동 리스팅! */}
                {isDetailPanelOpen && (
                    <div
                        style={{ width: `${detailPanelWidth}px` }}
                        className="shrink-0 border-l border-slate-200 bg-white p-4 flex flex-col justify-between overflow-y-auto transition-all shadow-xs relative"
                    >
                        {/* A. 선택된 공고가 있을 때 -> 상세 분석 정보 */}
                        {activeItem ? (
                            <div className="space-y-4">
                                {/* 헤더 */}
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <button
                                        onClick={() => setSelectedPostingId(null)}
                                        className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 hover:text-indigo-800 transition-colors"
                                        title="전체 공고 목록으로 돌아가기"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        <span>목록으로</span>
                                    </button>

                                    {(() => {
                                        const statusInfo = formatPostingStatus(
                                            activeItem.posting.status
                                        );
                                        return (
                                            <span
                                                className={`rounded-md border px-2 py-0.5 text-xs font-bold ${statusInfo.style}`}
                                            >
                                                {statusInfo.label}
                                            </span>
                                        );
                                    })()}
                                </div>

                                {/* 회사명 & 직무 타이틀 */}
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
                                        {activeItem.posting.companyName}
                                    </h2>
                                    <p className="text-sm font-bold text-slate-700 mt-1">
                                        {activeItem.posting.positionTitle}
                                    </p>
                                </div>

                                {/* 출퇴근 분석 세부 섹션 */}
                                <div className="space-y-3 border-t border-b border-slate-100 py-3.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                            <Navigation className="h-4 w-4 text-emerald-600" />
                                            <span>예상 출퇴근 시간</span>
                                        </div>
                                        <span className="text-base font-black text-emerald-600">
                                            ⏱️{' '}
                                            {activeItem.estimate?.formattedTimeText || '계산 대기'}
                                        </span>
                                    </div>

                                    {/* 2열 플랫 메트릭 라인 */}
                                    <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
                                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                            <span className="text-[11px] text-slate-400 font-medium block">
                                                예상 경로 거리
                                            </span>
                                            <strong className="text-sm font-extrabold text-slate-900">
                                                {activeItem.estimate?.estimatedDistanceKm ?? '-'} km
                                            </strong>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                            <span className="text-[11px] text-slate-400 font-medium block">
                                                직선 거리
                                            </span>
                                            <strong className="text-sm font-extrabold text-slate-900">
                                                {activeItem.estimate?.straightDistanceKm ?? '-'} km
                                            </strong>
                                        </div>
                                    </div>

                                    {/* 목적지 단일 텍스트 라인 */}
                                    <div className="text-xs text-slate-700 font-medium flex items-start gap-1.5 pt-1">
                                        <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                                        <span className="leading-relaxed">
                                            <strong className="text-slate-900">목적지:</strong>{' '}
                                            {activeItem.posting.location || '주소 미기재'}
                                        </span>
                                    </div>
                                </div>

                                {/* 세부 스펙 라인 */}
                                <div className="space-y-2.5 text-xs text-slate-700">
                                    {activeItem.posting.deadline && (
                                        <div className="flex items-center gap-2 font-medium">
                                            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                            <span className="text-slate-500">마감일:</span>
                                            <span className="font-bold text-slate-900">
                                                {activeItem.posting.deadline}
                                            </span>
                                        </div>
                                    )}
                                    {activeItem.posting.salaryNote && (
                                        <div className="flex items-center gap-2 font-medium">
                                            <DollarSign className="h-4 w-4 text-emerald-600 shrink-0" />
                                            <span className="font-semibold truncate">
                                                {activeItem.posting.salaryNote}
                                            </span>
                                        </div>
                                    )}
                                    {activeItem.posting.employmentType && (
                                        <div className="flex items-center gap-2 font-medium">
                                            <Briefcase className="h-4 w-4 text-indigo-600 shrink-0" />
                                            <span className="font-semibold">
                                                {activeItem.posting.employmentType}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* 외부 길찾기 웹 링크 버튼 */}
                                <div className="space-y-2 pt-1">
                                    <div className="text-xs font-bold text-slate-500">
                                        외부 길찾기 및 지도 연동
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <a
                                            href={getKakaoDirectionsUrl(
                                                activeItem.posting.companyName,
                                                activeItem.lat || 37.5,
                                                activeItem.lng || 127.0,
                                                homeLat,
                                                homeLng
                                            )}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/60 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5 text-amber-700" />
                                            카카오맵
                                        </a>
                                        <a
                                            href={getNaverDirectionsUrl(
                                                activeItem.posting.companyName,
                                                activeItem.lat || 37.5,
                                                activeItem.lng || 127.0,
                                                homeLat,
                                                homeLng
                                            )}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition-colors shadow-2xs"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5 text-emerald-700" />
                                            네이버지도
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* B. 🎯 [실시간 지도 화면 연동] 현재 화면 범위 안 공고만 100% 동적 표출 */
                            <div className="flex flex-col h-full space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                                        <ListFilter className="h-4 w-4 text-indigo-600" />
                                        <span>현재 지도 범위 공고</span>
                                        <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-black text-indigo-700">
                                            {visibleInViewportItems.length}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                                    {visibleInViewportItems.length === 0 ? (
                                        <div className="py-12 text-center text-slate-400 text-xs font-medium leading-relaxed">
                                            현재 화면에 노출된 공고가 없습니다.
                                            <br />
                                            지도를 다른 지역으로 이동해보세요!
                                        </div>
                                    ) : (
                                        visibleInViewportItems.map((item) => {
                                            const mins = item.estimate?.estimatedMinutes || 0;
                                            let badgeStyle =
                                                'bg-emerald-500/10 text-emerald-800 font-bold';
                                            let dotColor = 'bg-emerald-500';
                                            if (mins > 60) {
                                                badgeStyle =
                                                    'bg-rose-500/10 text-rose-800 font-bold';
                                                dotColor = 'bg-rose-500';
                                            } else if (mins > 45) {
                                                badgeStyle =
                                                    'bg-amber-500/10 text-amber-800 font-bold';
                                                dotColor = 'bg-amber-500';
                                            } else if (mins > 30) {
                                                badgeStyle =
                                                    'bg-indigo-500/10 text-indigo-800 font-bold';
                                                dotColor = 'bg-indigo-500';
                                            }

                                            return (
                                                <div
                                                    key={item.posting.id}
                                                    onClick={() => handleSelectPostingAndPan(item)}
                                                    className="group cursor-pointer py-3 px-1.5 hover:bg-slate-50 rounded-xl transition-all duration-150 space-y-1"
                                                >
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <div className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 flex items-center gap-1.5 truncate flex-1 min-w-0">
                                                            <span
                                                                className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`}
                                                            />
                                                            <span className="truncate">
                                                                {item.posting.companyName}
                                                            </span>
                                                        </div>
                                                        <span
                                                            className={`inline-flex items-center shrink-0 px-2 py-0.5 rounded-full text-[10px] ${badgeStyle}`}
                                                        >
                                                            ⏱️{' '}
                                                            {item.estimate?.formattedTimeText ||
                                                                '미상'}
                                                        </span>
                                                    </div>

                                                    <div className="text-xs font-semibold text-slate-600 truncate pl-3.5">
                                                        {item.posting.positionTitle}
                                                    </div>

                                                    <div className="flex items-center justify-between text-[11px] text-slate-400 pl-3.5 pt-0.5">
                                                        <span className="truncate max-w-[140px]">
                                                            📍{' '}
                                                            {item.posting.location || '위치 미상'}
                                                        </span>
                                                        <span className="text-indigo-600 font-bold text-[10px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            이동 →
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 하단 상세보기 모달 호출 버튼 */}
                        {activeItem && (
                            <div className="pt-3 border-t border-slate-100 mt-3">
                                <button
                                    onClick={() => onSelectPosting(activeItem.posting)}
                                    className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-md flex items-center justify-center gap-2"
                                >
                                    <Building2 className="h-4 w-4" />
                                    공고 상세 모달 열기
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 내 집 위치 설정 다이얼로그 모달 */}
            <HomeLocationModal
                isOpen={isHomeModalOpen}
                onClose={() => setIsHomeModalOpen(false)}
                settings={settings}
                onSuccess={(updated) => {
                    onUpdateSettings(updated);
                }}
            />
        </div>
    );
}
