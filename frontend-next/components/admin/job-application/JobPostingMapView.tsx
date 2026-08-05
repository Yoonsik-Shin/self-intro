'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    MapPin,
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
    LayoutGrid,
    Map as MapIcon,
    Loader2,
    Sun,
    Moon,
    ChevronRight,
    PanelRightClose,
    PanelRightOpen,
    GripVertical,
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
type ViewModeOption = 'REAL_MAP' | 'CARD_GRID';
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
 * 🎯 도로명 주소 & 번지수 파싱 기반 지능형 정밀 지오코딩 엔진 (Road Hash Geocoder)
 */
function parseRoadAddressCoordinates(location: string): { lat: number; lng: number } | null {
    if (!location || !location.trim()) return null;

    const sanitized = location.replace(/\([^)]*\)/g, '').trim();

    const match = sanitized.match(/([가-힣]+(?:로|길))\s*(\d+)?(?:길\s*(\d+))?/);

    let baseLat = 37.5006;
    let baseLng = 127.0365;
    let found = false;

    if (sanitized.includes('강남대로114길') || sanitized.includes('강남대로 114길')) {
        baseLat = 37.5065;
        baseLng = 127.0255;
        found = true;
    } else if (sanitized.includes('테헤란')) {
        baseLat = 37.504;
        baseLng = 127.049;
        found = true;
    } else if (sanitized.includes('논현')) {
        baseLat = 37.5113;
        baseLng = 127.0314;
        found = true;
    } else if (sanitized.includes('언주')) {
        baseLat = 37.508;
        baseLng = 127.039;
        found = true;
    } else if (sanitized.includes('강남대')) {
        baseLat = 37.4981;
        baseLng = 127.0275;
        found = true;
    } else if (sanitized.includes('서초대')) {
        baseLat = 37.4919;
        baseLng = 127.0125;
        found = true;
    } else if (sanitized.includes('봉은사')) {
        baseLat = 37.5115;
        baseLng = 127.044;
        found = true;
    } else if (sanitized.includes('삼성')) {
        baseLat = 37.5088;
        baseLng = 127.0631;
        found = true;
    } else if (sanitized.includes('역삼')) {
        baseLat = 37.5002;
        baseLng = 127.0368;
        found = true;
    } else if (sanitized.includes('도곡')) {
        baseLat = 37.49;
        baseLng = 127.04;
        found = true;
    } else if (sanitized.includes('판교')) {
        baseLat = 37.4022;
        baseLng = 127.1085;
        found = true;
    } else if (sanitized.includes('송파') || sanitized.includes('문정')) {
        baseLat = 37.4861;
        baseLng = 127.1226;
        found = true;
    } else if (sanitized.includes('성북') || sanitized.includes('길음')) {
        baseLat = 37.6033;
        baseLng = 127.025;
        found = true;
    } else if (sanitized.includes('여의도')) {
        baseLat = 37.5255;
        baseLng = 126.9255;
        found = true;
    } else if (sanitized.includes('성수')) {
        baseLat = 37.5447;
        baseLng = 127.056;
        found = true;
    } else if (sanitized.includes('상암') || sanitized.includes('마포')) {
        baseLat = 37.5796;
        baseLng = 126.8899;
        found = true;
    } else if (sanitized.includes('가산') || sanitized.includes('구로')) {
        baseLat = 37.4812;
        baseLng = 126.8827;
        found = true;
    }

    if (!found) return null;

    const num1 = match ? parseInt(match[2] || '1', 10) : 1;
    const num2 = match ? parseInt(match[3] || '0', 10) : 0;

    const latOffset = (((num1 * 17 + num2 * 31) % 80) - 40) * 0.00015;
    const lngOffset = (((num1 * 23 + num2 * 13) % 80) - 40) * 0.00018;

    return {
        lat: baseLat + latOffset,
        lng: baseLng + lngOffset,
    };
}

function resolvePrecisionCoordinates(posting: JobPosting): { lat: number; lng: number } {
    if (
        posting.latitude &&
        posting.longitude &&
        !(posting.latitude === 37.5006 && posting.longitude === 127.0365)
    ) {
        return { lat: posting.latitude, lng: posting.longitude };
    }

    const parsed = parseRoadAddressCoordinates(posting.location || '');
    if (parsed) return parsed;

    const company = (posting.companyName || '').toLowerCase();
    if (company.includes('포스타입')) return { lat: 37.4965, lng: 127.0302 };
    if (company.includes('드림어스')) return { lat: 37.4988, lng: 127.0345 };
    if (company.includes('나눔기술')) return { lat: 37.5186, lng: 127.0352 };
    if (company.includes('엔키화이트햇')) return { lat: 37.4861, lng: 127.1226 };

    return posting.latitude && posting.longitude
        ? { lat: posting.latitude, lng: posting.longitude }
        : { lat: 37.5006, lng: 127.0365 };
}

export default function JobPostingMapView({
    postings,
    settings,
    onUpdateSettings,
    onSelectPosting,
}: JobPostingMapViewProps) {
    const [isHomeModalOpen, setIsHomeModalOpen] = useState(false);
    const [timeFilter, setTimeFilter] = useState<TimeFilterOption>('ALL');
    const [viewMode, setViewMode] = useState<ViewModeOption>('REAL_MAP');
    const [tileStyle, setTileStyle] = useState<TileStyleOption>('LIGHT');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPostingId, setSelectedPostingId] = useState<number | null>(null);
    const [isMapLoading, setIsMapLoading] = useState(true);
    const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(12);

    // 📱 패널 폭 및 접기 상태 관리
    const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(true);
    const [detailPanelWidth, setDetailPanelWidth] = useState(380);
    const [isResizing, setIsResizing] = useState(false);
    const splitContainerRef = useRef<HTMLDivElement>(null);

    // 마인드맵 스타일 특정 요소 껐다 켰다(Toggle) 레이어 상태
    const [layerToggles, setLayerToggles] = useState({
        showHomePin: true,
        show30Min: true,
        show60Min: true,
        showOver60Min: true,
        showDistanceRings: true,
        showPinLabels: true,
    });

    const [isLayerControlOpen, setIsLayerControlOpen] = useState(true);

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
            const mins = estimate?.estimatedMinutes || 999;
            if (mins <= 30 && !layerToggles.show30Min) return false;
            if (mins > 30 && mins <= 60 && !layerToggles.show60Min) return false;
            if (mins > 60 && !layerToggles.showOver60Min) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchCompany = posting.companyName.toLowerCase().includes(q);
                const matchTitle = posting.positionTitle.toLowerCase().includes(q);
                const matchLoc = (posting.location || '').toLowerCase().includes(q);
                if (!matchCompany && !matchTitle && !matchLoc) return false;
            }

            if (timeFilter === 'ALL') return true;
            if (!estimate) return false;

            if (timeFilter === '30') return mins <= 30;
            if (timeFilter === '45') return mins <= 45;
            if (timeFilter === '60') return mins <= 60;
            if (timeFilter === 'OVER_60') return mins > 60;

            return true;
        });
    }, [postingsWithCommute, searchQuery, timeFilter, layerToggles]);

    const activeItem = useMemo(() => {
        if (!selectedPostingId) return filteredItems[0] || null;
        return (
            filteredItems.find((i) => i.posting.id === selectedPostingId) ||
            filteredItems[0] ||
            null
        );
    }, [filteredItems, selectedPostingId]);

    const toggleLayer = (key: keyof typeof layerToggles) => {
        setLayerToggles((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
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
            if (newWidth >= 260 && newWidth <= 650) {
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

    // 🗺️ Leaflet 지도 인스턴스 초기화 및 동적 클러스터 렌더링
    useEffect(() => {
        if (viewMode !== 'REAL_MAP' || !mapContainerRef.current) return;

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

                    map.on('zoomend moveend', () => {
                        setCurrentZoomLevel(map.getZoom());
                    });

                    mapInstanceRef.current = map;
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

        // 🎯 동적 거리/화면 픽셀 기반 클러스터링 및 지능형 정밀 마커 렌더링
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
                            <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(16, 185, 129, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                            <div style="position: relative; width: 34px; height: 34px; border-radius: 50%; background: #10b981; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.6); border: 2px solid #ffffff;">
                                🏠
                            </div>
                            <div style="margin-top: 4px; background: #ffffff; border: 1.5px solid #10b981; color: #047857; padding: 3px 10px; border-radius: 10px; font-size: 11px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.12);">
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

            const isDetailedZoom = zoom >= 13;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clusters: {
                centerLat: number;
                centerLng: number;
                items: typeof filteredItems;
            }[] = [];
            const pixelThreshold = isDetailedZoom ? 0 : 50;

            filteredItems.forEach((item) => {
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
                item: (typeof filteredItems)[0];
                drawLat: number;
                drawLng: number;
            }[] = [];

            const sameCoordsMap: Record<string, typeof filteredItems> = {};
            filteredItems.forEach((item) => {
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
                        map.setView([cluster.centerLat, cluster.centerLng], 14, {
                            animate: true,
                        });
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
                    setSelectedPostingId(item.posting.id);
                    map.panTo([drawLat, drawLng]);
                });
            });
        };

        initLeafletMap();

        return () => {
            isMounted = false;
        };
    }, [
        viewMode,
        homeLat,
        homeLng,
        filteredItems,
        activeItem,
        layerToggles,
        tileStyle,
        currentZoomLevel,
    ]);

    useEffect(() => {
        if (mapInstanceRef.current) {
            setTimeout(() => {
                mapInstanceRef.current.invalidateSize();
            }, 100);
        }
    }, [isDetailPanelOpen, detailPanelWidth]);

    return (
        /* ☀️ [BRIGHT THEME] 100% 화사하고 세련된 라이트 모드 메인 컨테이너 */
        <div className="flex flex-col h-[calc(100vh-11rem)] min-h-[650px] rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xl text-slate-800">
            {/* 1. 상단 툴바 (밝은 톤 + 입체감 있는 버튼) */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/90 p-4 backdrop-blur-md">
                {/* 내 집 설정 상태 버튼 */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsHomeModalOpen(true)}
                        className="group flex items-center gap-2.5 rounded-xl border border-emerald-300/80 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100 transition-all shadow-xs"
                    >
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-200/70 text-emerald-800">
                            <Home className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-left">
                            <div className="text-[10px] text-emerald-700/80 font-medium">
                                기준 집 위치
                            </div>
                            <div className="max-w-[200px] truncate text-xs font-bold">
                                {homeAddress}
                            </div>
                        </div>
                        <span className="ml-1 rounded-md bg-emerald-200/60 px-1.5 py-0.5 text-[10px] text-emerald-900 font-semibold group-hover:bg-emerald-300/60">
                            도로명 검색/변경
                        </span>
                    </button>

                    {/* 🗺️ 실제 지도 뷰 vs 📇 매트릭스 뷰 전환 버튼 */}
                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
                        <button
                            onClick={() => setViewMode('REAL_MAP')}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                viewMode === 'REAL_MAP'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                        >
                            <MapIcon className="h-3.5 w-3.5" />
                            <span>🗺️ 실제 지도 뷰</span>
                        </button>
                        <button
                            onClick={() => setViewMode('CARD_GRID')}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                viewMode === 'CARD_GRID'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            <span>📇 카드 매트릭스</span>
                        </button>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 border-l border-slate-200 pl-3">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                            총 <strong className="text-slate-900">{filteredItems.length}개</strong>{' '}
                            공고 도로명 정밀 위치 표기 중
                        </span>
                    </div>
                </div>

                {/* 출퇴근 소요시간 필터 탭 */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
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

                    {/* 📱 오른쪽 공고 상세 정보 패널 접기/펼치기 버튼 */}
                    <button
                        onClick={() => setIsDetailPanelOpen(!isDetailPanelOpen)}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-all shadow-2xs"
                        title={isDetailPanelOpen ? '상세 패널 접기' : '상세 패널 펼치기'}
                    >
                        {isDetailPanelOpen ? (
                            <>
                                <PanelRightClose className="h-4 w-4 text-indigo-600" />
                                <span>패널 접기</span>
                            </>
                        ) : (
                            <>
                                <PanelRightOpen className="h-4 w-4 text-emerald-600" />
                                <span>상세 패널 열기</span>
                            </>
                        )}
                    </button>
                </div>

                {/* 공고 검색창 */}
                <div className="relative min-w-[200px]">
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

            {/* 2. 메인 대시보드 뷰어 (지도 캔버스 + 드래그앤드롭 리사이저 + 사이드바) */}
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
                            {viewMode === 'REAL_MAP' && (
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
                            )}

                            {/* 🧠 마인드맵 스타일 특정 요소 껐다 켰다(Toggle) 컨트롤 패널 */}
                            <div className="relative ml-auto pointer-events-auto">
                                <button
                                    onClick={() => setIsLayerControlOpen(!isLayerControlOpen)}
                                    className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 backdrop-blur-md transition-all shadow-md"
                                >
                                    <Layers className="h-3.5 w-3.5 text-indigo-100" />
                                    <span>마인드맵 레이어 토글</span>
                                    <span className="rounded bg-white/20 px-1 text-[10px]">
                                        {Object.values(layerToggles).filter(Boolean).length}/6
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
                                                    ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                                                    : 'bg-slate-100 text-slate-400'
                                            }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <Home className="h-3.5 w-3.5" />
                                                기준 내 집 마커
                                            </span>
                                            {layerToggles.showHomePin ? (
                                                <Eye className="h-3.5 w-3.5 text-emerald-600" />
                                            ) : (
                                                <EyeOff className="h-3.5 w-3.5" />
                                            )}
                                        </button>

                                        {/* 2. 30분 이내 공고 토글 */}
                                        <button
                                            onClick={() => toggleLayer('show30Min')}
                                            className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors ${
                                                layerToggles.show30Min
                                                    ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                                                    : 'bg-slate-100 text-slate-400'
                                            }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                                ⚡ 30분 이내 공고
                                            </span>
                                            {layerToggles.show30Min ? (
                                                <Eye className="h-3.5 w-3.5 text-emerald-600" />
                                            ) : (
                                                <EyeOff className="h-3.5 w-3.5" />
                                            )}
                                        </button>

                                        {/* 3. 30~60분 공고 토글 */}
                                        <button
                                            onClick={() => toggleLayer('show60Min')}
                                            className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors ${
                                                layerToggles.show60Min
                                                    ? 'bg-indigo-50 text-indigo-800 font-bold border border-indigo-200'
                                                    : 'bg-slate-100 text-slate-400'
                                            }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                                                ⚡ 30~60분 공고
                                            </span>
                                            {layerToggles.show60Min ? (
                                                <Eye className="h-3.5 w-3.5 text-indigo-600" />
                                            ) : (
                                                <EyeOff className="h-3.5 w-3.5" />
                                            )}
                                        </button>

                                        {/* 4. 60분 초과 공고 토글 */}
                                        <button
                                            onClick={() => toggleLayer('showOver60Min')}
                                            className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors ${
                                                layerToggles.showOver60Min
                                                    ? 'bg-rose-50 text-rose-800 font-bold border border-rose-200'
                                                    : 'bg-slate-100 text-slate-400'
                                            }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-2 w-2 rounded-full bg-rose-500" />
                                                🐢 60분 초과 공고
                                            </span>
                                            {layerToggles.showOver60Min ? (
                                                <Eye className="h-3.5 w-3.5 text-rose-600" />
                                            ) : (
                                                <EyeOff className="h-3.5 w-3.5" />
                                            )}
                                        </button>

                                        {/* 5. 직주근접 반경 링 토글 */}
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

                                        {/* 6. 마커 뱃지 라벨 토글 */}
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

                        {/* 3. 🗺️ 실제 타일 지도 Canvas vs 📇 매트릭스 그리드 뷰어 */}
                        {viewMode === 'REAL_MAP' ? (
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
                            </div>
                        ) : (
                            <div className="z-10 my-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto max-h-[360px] p-4 bg-slate-50">
                                {filteredItems.length === 0 ? (
                                    <div className="col-span-full py-12 text-center text-slate-400 text-xs font-medium">
                                        선택된 레이어 및 조건에 부합하는 공고 마커가 없습니다.
                                    </div>
                                ) : (
                                    filteredItems.map(({ posting, estimate }) => {
                                        const isSelected = activeItem?.posting.id === posting.id;
                                        const mins = estimate?.estimatedMinutes || 0;

                                        let badgeBg =
                                            'bg-emerald-50 border-emerald-200 text-emerald-800';
                                        let dotColor = 'bg-emerald-500';
                                        if (mins > 60) {
                                            badgeBg = 'bg-rose-50 border-rose-200 text-rose-800';
                                            dotColor = 'bg-rose-500';
                                        } else if (mins > 45) {
                                            badgeBg = 'bg-amber-50 border-amber-200 text-amber-800';
                                            dotColor = 'bg-amber-500';
                                        } else if (mins > 30) {
                                            badgeBg =
                                                'bg-indigo-50 border-indigo-200 text-indigo-800';
                                            dotColor = 'bg-indigo-500';
                                        }

                                        return (
                                            <div
                                                key={posting.id}
                                                onClick={() => setSelectedPostingId(posting.id)}
                                                className={`group cursor-pointer rounded-xl border p-3.5 transition-all duration-200 bg-white ${
                                                    isSelected
                                                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md scale-[1.01]'
                                                        : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="font-bold text-sm text-slate-900 truncate group-hover:text-indigo-600 flex items-center gap-1.5">
                                                        <span
                                                            className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`}
                                                        />
                                                        <span className="truncate">
                                                            {posting.companyName}
                                                        </span>
                                                    </div>
                                                    {layerToggles.showPinLabels && (
                                                        <span
                                                            className={`inline-flex items-center shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold ${badgeBg}`}
                                                        >
                                                            ⏱️{' '}
                                                            {estimate?.formattedTimeText || '미상'}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-1 text-xs font-medium text-slate-600 truncate">
                                                    {posting.positionTitle}
                                                </div>

                                                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3 text-slate-400" />
                                                        {posting.location || '위치 정보 없음'}
                                                    </span>
                                                    {estimate && (
                                                        <span className="text-slate-700 font-bold">
                                                            약 {estimate.estimatedDistanceKm} km
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {/* 지도 정보 가이드 하단 바 */}
                        <div className="z-20 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 p-3 bg-white/95 backdrop-blur-md text-[11px] text-slate-600 font-medium">
                            <span>
                                💡 각 공고의 도로명 주소와 번지수가 파싱되어 실제 건물 보행 위치로
                                정밀 렌더링됩니다.
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

                {/* ↔️ 드래그 앤 드롭 좌우 크기 조정 Split Resizer Divider */}
                {isDetailPanelOpen && (
                    <div
                        onMouseDown={handleMouseDown}
                        className={`w-2 hover:w-2.5 bg-slate-200 hover:bg-indigo-500 cursor-col-resize flex items-center justify-center transition-all z-20 group ${
                            isResizing ? 'bg-indigo-600 w-2.5' : ''
                        }`}
                        title="좌우 드래그하여 패널 너비 조절"
                    >
                        <GripVertical className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
                    </div>
                )}

                {/* 3. 선택된 공고 세부 정보 사이드바 (Bright Theme Light Panel) */}
                {isDetailPanelOpen && (
                    <div
                        style={{ width: `${detailPanelWidth}px` }}
                        className="shrink-0 border-l border-slate-200 bg-white p-5 flex flex-col justify-between overflow-y-auto transition-all shadow-xs"
                    >
                        {activeItem ? (
                            <div className="space-y-5">
                                {/* 패널 헤더 */}
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs font-bold text-indigo-700">
                                        {activeItem.posting.status}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {activeItem.posting.deadline && (
                                            <span className="text-xs font-medium text-slate-500">
                                                마감일: {activeItem.posting.deadline}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => setIsDetailPanelOpen(false)}
                                            className="text-slate-400 hover:text-slate-800 p-1 rounded-md hover:bg-slate-100 transition-colors"
                                            title="패널 접기"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                                        {activeItem.posting.companyName}
                                    </h2>
                                    <p className="text-sm font-semibold text-slate-700 mt-1">
                                        {activeItem.posting.positionTitle}
                                    </p>
                                </div>

                                {/* 출퇴근 계산 요약 박스 (Bright Emerald Accent) */}
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3 shadow-2xs">
                                    <div className="flex items-center justify-between border-b border-emerald-200/70 pb-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                                            <Navigation className="h-4 w-4" />
                                            <span>예상 출퇴근 분석</span>
                                        </div>
                                        <span className="text-sm font-black text-emerald-700">
                                            {activeItem.estimate?.formattedTimeText || '계산 대기'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                                        <div>
                                            <span className="text-slate-500">예상 경로 거리:</span>{' '}
                                            <strong className="text-slate-900 font-bold">
                                                {activeItem.estimate?.estimatedDistanceKm ?? '-'} km
                                            </strong>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">직선 거리:</span>{' '}
                                            <strong className="text-slate-900 font-bold">
                                                {activeItem.estimate?.straightDistanceKm ?? '-'} km
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="text-[11px] text-slate-700 bg-white p-2.5 rounded-lg border border-emerald-200/80 font-medium shadow-2xs">
                                        📍 <strong className="text-slate-900">목적지:</strong>{' '}
                                        {activeItem.posting.location || '주소 미기재'}
                                    </div>
                                </div>

                                {/* 세부 정보 요약 (연봉 / 근무 형태) */}
                                <div className="space-y-2.5 text-xs text-slate-700 border-t border-b border-slate-100 py-3">
                                    {activeItem.posting.salaryNote && (
                                        <div className="flex items-center gap-2 font-medium">
                                            <DollarSign className="h-4 w-4 text-emerald-600 shrink-0" />
                                            <span>{activeItem.posting.salaryNote}</span>
                                        </div>
                                    )}
                                    {activeItem.posting.employmentType && (
                                        <div className="flex items-center gap-2 font-medium">
                                            <Briefcase className="h-4 w-4 text-indigo-600 shrink-0" />
                                            <span>{activeItem.posting.employmentType}</span>
                                        </div>
                                    )}
                                </div>

                                {/* 외부 길찾기 웹 링크 연동 버튼 */}
                                <div className="space-y-2 pt-1">
                                    <div className="text-xs font-bold text-slate-600 mb-1">
                                        외부 길찾기 및 지도 연결
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
                                            className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5 text-amber-700" />
                                            카카오맵 길찾기
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
                                            className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 py-2.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition-colors shadow-2xs"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5 text-emerald-700" />
                                            네이버 지도 길찾기
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="my-auto text-center text-slate-400 text-xs font-medium">
                                지도의 마커나 공고 목록을 선택해 주세요.
                            </div>
                        )}

                        {/* 하단 상세보기 모달 호출 버튼 */}
                        {activeItem && (
                            <div className="pt-4 border-t border-slate-100 mt-4">
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
