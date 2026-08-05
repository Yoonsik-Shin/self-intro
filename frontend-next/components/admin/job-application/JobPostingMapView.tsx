'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
} from 'lucide-react';
import type { JobPosting, JobPostingSetting } from '@/lib/api/types';
import {
    estimateCommuteTime,
    getKakaoDirectionsUrl,
    getNaverDirectionsUrl,
    CommuteEstimate,
} from '@/lib/utils/commuteCalculator';
import HomeLocationModal from './HomeLocationModal';

// Leaflet CSS CDN 로드
import 'leaflet/dist/leaflet.css';

interface JobPostingMapViewProps {
    postings: JobPosting[];
    settings: JobPostingSetting | null;
    onUpdateSettings: (settings: JobPostingSetting) => void;
    onSelectPosting: (posting: JobPosting) => void;
}

type TimeFilterOption = 'ALL' | '30' | '45' | '60' | 'OVER_60';
type ViewModeOption = 'REAL_MAP' | 'CARD_GRID';
type TileStyleOption = 'DARK' | 'STREET';

export default function JobPostingMapView({
    postings,
    settings,
    onUpdateSettings,
    onSelectPosting,
}: JobPostingMapViewProps) {
    const [isHomeModalOpen, setIsHomeModalOpen] = useState(false);
    const [timeFilter, setTimeFilter] = useState<TimeFilterOption>('ALL');
    const [viewMode, setViewMode] = useState<ViewModeOption>('REAL_MAP'); // 🗺️ 진짜 타일 지도 기본값
    const [tileStyle, setTileStyle] = useState<TileStyleOption>('DARK');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPostingId, setSelectedPostingId] = useState<number | null>(null);

    // 마인드맵 스타일 특정 요소 껐다 켰다(Toggle) 레이어 상태
    const [layerToggles, setLayerToggles] = useState({
        showHomePin: true, // 🏠 내 집 위치 마커 켜기/끄기
        show30Min: true, // ⚡ 30분 이내 초고속 직주근접 핀 켜기/끄기
        show60Min: true, // ⚡ 30~60분 적정 출퇴근 핀 켜기/끄기
        showOver60Min: true, // 🐢 60분 초과/장거리 핀 켜기/끄기
        showDistanceRings: true, // 🎯 직주근접 동심원 반경 링 (10km / 20km / 30km) 켜기/끄기
        showPinLabels: true, // 🏷️ 마커 뱃지 라벨 항상 켜기/끄기
    });

    const [isLayerControlOpen, setIsLayerControlOpen] = useState(true);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInstanceRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markersGroupRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ringsGroupRef = useRef<any>(null);

    // 기본 집 위치 (설정 값이 없을 시 서울 마포구 상암동 좌표를 기본값으로 제공)
    const homeLat = settings?.homeLatitude ?? 37.5796;
    const homeLng = settings?.homeLongitude ?? 126.8899;
    const homeAddress = settings?.homeAddress || '서울 마포구 월드컵북로 400 (기본)';

    // 공고별 예상 출퇴근 시간 계산 및 매핑
    const postingsWithCommute = useMemo(() => {
        return postings.map((posting) => {
            let estimate: CommuteEstimate | null = null;

            let lat = posting.latitude;
            let lng = posting.longitude;

            if (!lat || !lng) {
                const loc = posting.location || '';
                if (loc.includes('강남') || loc.includes('역삼')) {
                    lat = 37.5006;
                    lng = 127.0365;
                } else if (loc.includes('판교') || loc.includes('분당')) {
                    lat = 37.3948;
                    lng = 127.1112;
                } else if (loc.includes('여의도') || loc.includes('영등포')) {
                    lat = 37.5255;
                    lng = 126.9255;
                } else if (loc.includes('성수')) {
                    lat = 37.5447;
                    lng = 127.056;
                } else if (loc.includes('마포') || loc.includes('상암') || loc.includes('서교')) {
                    lat = 37.5796;
                    lng = 126.8899;
                } else if (loc.includes('가산') || loc.includes('구로')) {
                    lat = 37.4812;
                    lng = 126.8827;
                } else if (loc.includes('송파') || loc.includes('문정')) {
                    lat = 37.4861;
                    lng = 127.1226;
                } else if (loc.includes('성북') || loc.includes('길음')) {
                    lat = 37.6033;
                    lng = 127.025;
                }
            }

            if (lat && lng) {
                estimate = estimateCommuteTime(homeLat, homeLng, lat, lng);
            }

            return {
                posting,
                lat,
                lng,
                estimate,
            };
        });
    }, [postings, homeLat, homeLng]);

    // 검색 및 소요시간 필터링 + 마인드맵 레이어 토글 적용
    const filteredItems = useMemo(() => {
        return postingsWithCommute.filter(({ posting, estimate }) => {
            // 1. 레이어 토글 필터 (30분 이내 / 30~60분 / 60분 초과)
            const mins = estimate?.estimatedMinutes || 999;
            if (mins <= 30 && !layerToggles.show30Min) return false;
            if (mins > 30 && mins <= 60 && !layerToggles.show60Min) return false;
            if (mins > 60 && !layerToggles.showOver60Min) return false;

            // 2. 상단 검색어 필터
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchCompany = posting.companyName.toLowerCase().includes(q);
                const matchTitle = posting.positionTitle.toLowerCase().includes(q);
                const matchLoc = (posting.location || '').toLowerCase().includes(q);
                if (!matchCompany && !matchTitle && !matchLoc) return false;
            }

            // 3. 상단 시간 필터 탭
            if (timeFilter === 'ALL') return true;
            if (!estimate) return false;

            if (timeFilter === '30') return mins <= 30;
            if (timeFilter === '45') return mins <= 45;
            if (timeFilter === '60') return mins <= 60;
            if (timeFilter === 'OVER_60') return mins > 60;

            return true;
        });
    }, [postingsWithCommute, searchQuery, timeFilter, layerToggles]);

    // 선택된 공고 아이템
    const activeItem = useMemo(() => {
        if (!selectedPostingId) return filteredItems[0] || null;
        return (
            filteredItems.find((i) => i.posting.id === selectedPostingId) ||
            filteredItems[0] ||
            null
        );
    }, [filteredItems, selectedPostingId]);

    // 마인드맵 토글 핸들러
    const toggleLayer = (key: keyof typeof layerToggles) => {
        setLayerToggles((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    // 🗺️ Leaflet 실제 지도 엔진 인스턴스 초기화 및 마커/반경 링 렌더링
    useEffect(() => {
        if (viewMode !== 'REAL_MAP' || !mapContainerRef.current) return;

        let isMounted = true;

        const initLeafletMap = async () => {
            const L = (await import('leaflet')).default;

            if (!isMounted || !mapContainerRef.current) return;

            // 기존 지도가 생성되어 있다면 재사용 또는 갱신
            if (!mapInstanceRef.current) {
                const map = L.map(mapContainerRef.current, {
                    center: [homeLat, homeLng],
                    zoom: 11,
                    zoomControl: false,
                });

                L.control.zoom({ position: 'bottomright' }).addTo(map);

                const tileUrl =
                    tileStyle === 'DARK'
                        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

                const attribution =
                    tileStyle === 'DARK'
                        ? '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap'
                        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

                L.tileLayer(tileUrl, {
                    attribution,
                    maxZoom: 19,
                }).addTo(map);

                markersGroupRef.current = L.layerGroup().addTo(map);
                ringsGroupRef.current = L.layerGroup().addTo(map);

                mapInstanceRef.current = map;
            } else {
                const map = mapInstanceRef.current;
                map.setView([homeLat, homeLng]);
            }

            const map = mapInstanceRef.current;
            const markersGroup = markersGroupRef.current;
            const ringsGroup = ringsGroupRef.current;

            if (!markersGroup || !ringsGroup) return;

            markersGroup.clearLayers();
            ringsGroup.clearLayers();

            // 🎯 1. 반경 동심원 (10km, 20km, 30km)
            if (layerToggles.showDistanceRings) {
                L.circle([homeLat, homeLng], {
                    radius: 10000,
                    color: '#10b981',
                    weight: 1.5,
                    dashArray: '4, 4',
                    fillOpacity: 0.03,
                }).addTo(ringsGroup);

                L.circle([homeLat, homeLng], {
                    radius: 20000,
                    color: '#6366f1',
                    weight: 1.5,
                    dashArray: '4, 4',
                    fillOpacity: 0.02,
                }).addTo(ringsGroup);

                L.circle([homeLat, homeLng], {
                    radius: 30000,
                    color: '#f59e0b',
                    weight: 1.5,
                    dashArray: '4, 4',
                    fillOpacity: 0.01,
                }).addTo(ringsGroup);
            }

            // 🏠 2. 내 집 위치 마커 (Home Marker)
            if (layerToggles.showHomePin) {
                const homeIcon = L.divIcon({
                    className: 'custom-home-icon',
                    html: `
                        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                            <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(16, 185, 129, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                            <div style="position: relative; width: 32px; height: 32px; border-radius: 50%; background: #10b981; color: #09090b; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.5); border: 2px solid #ffffff;">
                                🏠
                            </div>
                            <div style="margin-top: 4px; background: rgba(24, 24, 27, 0.95); border: 1px solid rgba(16, 185, 129, 0.5); color: #6ee7b7; padding: 2px 8px; border-radius: 8px; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
                                🏠 내 집 출발점
                            </div>
                        </div>
                    `,
                    iconSize: [120, 60],
                    iconAnchor: [60, 30],
                });

                const homeMarker = L.marker([homeLat, homeLng], { icon: homeIcon }).addTo(
                    markersGroup
                );
                homeMarker.on('click', () => setIsHomeModalOpen(true));
            }

            // 📍 3. 공고 마커 핀들 (Posting Map Markers)
            filteredItems.forEach(({ posting, estimate, lat, lng }) => {
                if (!lat || !lng) return;

                const isSelected = activeItem?.posting.id === posting.id;
                const mins = estimate?.estimatedMinutes || 0;

                let colorHex = '#10b981'; // Emerald
                if (mins > 60)
                    colorHex = '#f43f5e'; // Rose
                else if (mins > 45)
                    colorHex = '#f59e0b'; // Amber
                else if (mins > 30) colorHex = '#6366f1'; // Indigo

                const labelHtml = layerToggles.showPinLabels
                    ? `<div style="margin-top: 3px; background: rgba(24, 24, 27, 0.9); border: 1px solid ${colorHex}; color: ${colorHex}; padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
                        ${posting.companyName} ${estimate?.formattedTimeText ? `(${estimate.formattedTimeText})` : ''}
                       </div>`
                    : '';

                const selectedRingHtml = isSelected
                    ? `<div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: ${colorHex}66; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
                    : '';

                const customPinIcon = L.divIcon({
                    className: 'custom-posting-pin',
                    html: `
                        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform 0.2s; ${isSelected ? 'transform: scale(1.25); z-index: 9999;' : ''}">
                            ${selectedRingHtml}
                            <div style="position: relative; width: 28px; height: 28px; border-radius: 50%; background: ${colorHex}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 4px 12px ${colorHex}88; border: 2px solid #ffffff;">
                                📍
                            </div>
                            ${labelHtml}
                        </div>
                    `,
                    iconSize: [120, 50],
                    iconAnchor: [60, 25],
                });

                const postingMarker = L.marker([lat, lng], { icon: customPinIcon }).addTo(
                    markersGroup
                );

                postingMarker.on('click', () => {
                    setSelectedPostingId(posting.id);
                    map.panTo([lat, lng]);
                });
            });
        };

        initLeafletMap();

        return () => {
            isMounted = false;
        };
    }, [viewMode, homeLat, homeLng, filteredItems, activeItem, layerToggles, tileStyle]);

    return (
        <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[650px] rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
            {/* 1. 상단 툴바 (내 집 정보 + 뷰모드 Switcher + 필터 + 검색) */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/90 p-4 backdrop-blur-md">
                {/* 내 집 설정 상태 버튼 */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsHomeModalOpen(true)}
                        className="group flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/20 transition-all shadow-sm"
                    >
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                            <Home className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-left">
                            <div className="text-[10px] text-emerald-400/80 font-normal">
                                기준 집 위치
                            </div>
                            <div className="max-w-[200px] truncate text-xs font-semibold">
                                {homeAddress}
                            </div>
                        </div>
                        <span className="ml-1 rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300 group-hover:bg-emerald-500/30">
                            도로명 검색/변경
                        </span>
                    </button>

                    {/* 🗺️ 진짜 지도 뷰 vs 📇 매트릭스 뷰 전환 버튼 */}
                    <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                        <button
                            onClick={() => setViewMode('REAL_MAP')}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                viewMode === 'REAL_MAP'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            <MapIcon className="h-3.5 w-3.5" />
                            <span>🗺️ 실제 지도 뷰</span>
                        </button>
                        <button
                            onClick={() => setViewMode('CARD_GRID')}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                viewMode === 'CARD_GRID'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            <span>📇 카드 매트릭스</span>
                        </button>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 border-l border-zinc-800 pl-3">
                        <Clock className="h-3.5 w-3.5 text-zinc-500" />
                        <span>
                            총 <strong>{filteredItems.length}개</strong> 공고 위치 표기 중
                        </span>
                    </div>
                </div>

                {/* 출퇴근 소요시간 필터 탭 */}
                <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                    <button
                        onClick={() => setTimeFilter('ALL')}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                            timeFilter === 'ALL'
                                ? 'bg-zinc-800 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        전체
                    </button>
                    <button
                        onClick={() => setTimeFilter('30')}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                            timeFilter === '30'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        ⚡ 30분 이내
                    </button>
                    <button
                        onClick={() => setTimeFilter('45')}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                            timeFilter === '45'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        ⚡ 45분 이내
                    </button>
                    <button
                        onClick={() => setTimeFilter('60')}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                            timeFilter === '60'
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        ⚡ 60분 이내
                    </button>
                </div>

                {/* 공고 검색창 */}
                <div className="relative min-w-[200px]">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="회사명 또는 지역 검색..."
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-1.5 pl-9 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                    />
                    <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-zinc-500" />
                </div>
            </div>

            {/* 2. 메인 대시보드 뷰어 (실제 지도 타일 캔버스 + 공고 상세 리스트 사이드바) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
                {/* 지도 시각화 캔버스 (Left 8 cols) */}
                <div className="relative lg:col-span-8 bg-zinc-950 overflow-hidden flex flex-col items-center justify-center p-4">
                    {/* Interactive Leaflet Real Map Tile Canvas */}
                    <div className="relative w-full h-full rounded-xl border border-zinc-800/80 bg-zinc-900/50 flex flex-col justify-between overflow-hidden">
                        {/* 지도 상단 마인드맵 토글 패널 및 지도 타일 스타일 변경 바 */}
                        <div className="absolute top-4 left-4 right-4 z-20 flex items-start justify-between pointer-events-none">
                            {/* 지도 타일 스위처 (다크 모드 타일 vs 일반 지도 타일) */}
                            {viewMode === 'REAL_MAP' && (
                                <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 p-1 backdrop-blur-md shadow-lg text-xs">
                                    <button
                                        onClick={() => setTileStyle('DARK')}
                                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                                            tileStyle === 'DARK'
                                                ? 'bg-zinc-800 text-white shadow-sm'
                                                : 'text-zinc-400 hover:text-zinc-200'
                                        }`}
                                    >
                                        🌙 다크 지도
                                    </button>
                                    <button
                                        onClick={() => setTileStyle('STREET')}
                                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                                            tileStyle === 'STREET'
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-zinc-400 hover:text-zinc-200'
                                        }`}
                                    >
                                        🗺️ 일반 타일 지도
                                    </button>
                                </div>
                            )}

                            {/* 🧠 마인드맵 스타일 특정 요소 껐다 켰다(Toggle) 컨트롤 패널 */}
                            <div className="relative ml-auto pointer-events-auto">
                                <button
                                    onClick={() => setIsLayerControlOpen(!isLayerControlOpen)}
                                    className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-600 backdrop-blur-md transition-all shadow-md"
                                >
                                    <Layers className="h-3.5 w-3.5 text-indigo-300" />
                                    <span>마인드맵 레이어 토글</span>
                                    <span className="rounded bg-indigo-400/20 px-1 text-[10px]">
                                        {Object.values(layerToggles).filter(Boolean).length}/6
                                    </span>
                                </button>

                                {isLayerControlOpen && (
                                    <div className="absolute right-0 top-9 w-64 rounded-2xl border border-zinc-800 bg-zinc-900/95 p-3.5 backdrop-blur-xl shadow-2xl space-y-2 z-30 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
                                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2 text-[11px] font-semibold text-zinc-400">
                                            <span className="flex items-center gap-1">
                                                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                                                지도 요소 켜기/끄기
                                            </span>
                                            <span>토글 컨트롤</span>
                                        </div>

                                        {/* 1. 내 집 마커 토글 */}
                                        <button
                                            onClick={() => toggleLayer('showHomePin')}
                                            className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors ${
                                                layerToggles.showHomePin
                                                    ? 'bg-emerald-500/15 text-emerald-300 font-semibold'
                                                    : 'bg-zinc-800/40 text-zinc-500'
                                            }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <Home className="h-3.5 w-3.5" />
                                                기준 내 집 마커
                                            </span>
                                            {layerToggles.showHomePin ? (
                                                <Eye className="h-3.5 w-3.5 text-emerald-400" />
                                            ) : (
                                                <EyeOff className="h-3.5 w-3.5" />
                                            )}
                                        </button>

                                        {/* 2. 30분 이내 공고 토글 */}
                                        <button
                                            onClick={() => toggleLayer('show30Min')}
                                            className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors ${
                                                layerToggles.show30Min
                                                    ? 'bg-emerald-500/15 text-emerald-300 font-semibold'
                                                    : 'bg-zinc-800/40 text-zinc-500'
                                            }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                                ⚡ 30분 이내 공고
                                            </span>
                                            {layerToggles.show30Min ? (
                                                <Eye className="h-3.5 w-3.5 text-emerald-400" />
                                            ) : (
                                                <EyeOff className="h-3.5 w-3.5" />
                                            )}
                                        </button>

                                        {/* 3. 30~60분 공고 토글 */}
                                        <button
                                            onClick={() => toggleLayer('show60Min')}
                                            className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors ${
                                                layerToggles.show60Min
                                                    ? 'bg-indigo-500/15 text-indigo-300 font-semibold'
                                                    : 'bg-zinc-800/40 text-zinc-500'
                                            }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                                                ⚡ 30~60분 공고
                                            </span>
                                            {layerToggles.show60Min ? (
                                                <Eye className="h-3.5 w-3.5 text-indigo-400" />
                                            ) : (
                                                <EyeOff className="h-3.5 w-3.5" />
                                            )}
                                        </button>

                                        {/* 4. 60분 초과 공고 토글 */}
                                        <button
                                            onClick={() => toggleLayer('showOver60Min')}
                                            className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors ${
                                                layerToggles.showOver60Min
                                                    ? 'bg-rose-500/15 text-rose-300 font-semibold'
                                                    : 'bg-zinc-800/40 text-zinc-500'
                                            }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-2 w-2 rounded-full bg-rose-400" />
                                                🐢 60분 초과 공고
                                            </span>
                                            {layerToggles.showOver60Min ? (
                                                <Eye className="h-3.5 w-3.5 text-rose-400" />
                                            ) : (
                                                <EyeOff className="h-3.5 w-3.5" />
                                            )}
                                        </button>

                                        {/* 5. 직주근접 반경 링 토글 */}
                                        <button
                                            onClick={() => toggleLayer('showDistanceRings')}
                                            className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors ${
                                                layerToggles.showDistanceRings
                                                    ? 'bg-amber-500/15 text-amber-300 font-semibold'
                                                    : 'bg-zinc-800/40 text-zinc-500'
                                            }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <Compass className="h-3.5 w-3.5" />
                                                🎯 반경 동심원 (10/20/30km)
                                            </span>
                                            {layerToggles.showDistanceRings ? (
                                                <Eye className="h-3.5 w-3.5 text-amber-400" />
                                            ) : (
                                                <EyeOff className="h-3.5 w-3.5" />
                                            )}
                                        </button>

                                        {/* 6. 마커 뱃지 라벨 토글 */}
                                        <button
                                            onClick={() => toggleLayer('showPinLabels')}
                                            className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors ${
                                                layerToggles.showPinLabels
                                                    ? 'bg-purple-500/15 text-purple-300 font-semibold'
                                                    : 'bg-zinc-800/40 text-zinc-500'
                                            }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <Radio className="h-3.5 w-3.5" />
                                                🏷️ 마커 뱃지 라벨 보기
                                            </span>
                                            {layerToggles.showPinLabels ? (
                                                <Eye className="h-3.5 w-3.5 text-purple-400" />
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
                            /* [MODE 1] 🗺️ 실제 도로/지명 타일 지도 (Leaflet Map Tile Engine) */
                            <div
                                ref={mapContainerRef}
                                className="w-full h-full min-h-[450px] z-0 rounded-xl overflow-hidden bg-zinc-950"
                            />
                        ) : (
                            /* [MODE 2] 📇 카드 매트릭스 그리드 뷰어 */
                            <div className="z-10 my-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto max-h-[360px] p-4">
                                {filteredItems.length === 0 ? (
                                    <div className="col-span-full py-12 text-center text-zinc-500 text-xs">
                                        선택된 레이어 및 조건에 부합하는 공고 마커가 없습니다.
                                    </div>
                                ) : (
                                    filteredItems.map(({ posting, estimate }) => {
                                        const isSelected = activeItem?.posting.id === posting.id;
                                        const mins = estimate?.estimatedMinutes || 0;

                                        let badgeBg =
                                            'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
                                        let dotColor = 'bg-emerald-400';
                                        if (mins > 60) {
                                            badgeBg =
                                                'bg-rose-500/15 border-rose-500/30 text-rose-300';
                                            dotColor = 'bg-rose-400';
                                        } else if (mins > 45) {
                                            badgeBg =
                                                'bg-amber-500/15 border-amber-500/30 text-amber-300';
                                            dotColor = 'bg-amber-400';
                                        } else if (mins > 30) {
                                            badgeBg =
                                                'bg-indigo-500/15 border-indigo-500/30 text-indigo-300';
                                            dotColor = 'bg-indigo-400';
                                        }

                                        return (
                                            <div
                                                key={posting.id}
                                                onClick={() => setSelectedPostingId(posting.id)}
                                                className={`group cursor-pointer rounded-xl border p-3.5 transition-all duration-200 ${
                                                    isSelected
                                                        ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/40 shadow-lg shadow-indigo-500/10 scale-[1.02]'
                                                        : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 hover:bg-zinc-800/60'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="font-semibold text-sm text-zinc-100 truncate group-hover:text-white flex items-center gap-1.5">
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

                                                <div className="mt-1 text-xs text-zinc-400 truncate">
                                                    {posting.positionTitle}
                                                </div>

                                                <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-500 border-t border-zinc-800/60 pt-2">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3 text-zinc-400" />
                                                        {posting.location || '위치 정보 없음'}
                                                    </span>
                                                    {estimate && (
                                                        <span className="text-zinc-400 font-medium">
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
                        <div className="z-20 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 p-3 bg-zinc-900/90 backdrop-blur-md text-[11px] text-zinc-500">
                            <span>
                                💡 실제 지도 타일 위 마커를 클릭하면 이동 경로와 지원 공고 정보가
                                표기됩니다.
                            </span>
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400" /> 30분
                                    이내
                                </span>
                                <span className="flex items-center gap-1 text-indigo-400 font-medium">
                                    <span className="h-2 w-2 rounded-full bg-indigo-400" /> 45분
                                    이내
                                </span>
                                <span className="flex items-center gap-1 text-amber-400 font-medium">
                                    <span className="h-2 w-2 rounded-full bg-amber-400" /> 60분 이내
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. 선택된 공고 세부 정보 사이드바 (Right 4 cols) */}
                <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-900/60 p-5 flex flex-col justify-between overflow-y-auto">
                    {activeItem ? (
                        <div className="space-y-5">
                            {/* 회사 및 직무 헤더 */}
                            <div>
                                <div className="flex items-center justify-between">
                                    <span className="rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-400">
                                        {activeItem.posting.status}
                                    </span>
                                    {activeItem.posting.deadline && (
                                        <span className="text-xs text-zinc-400">
                                            마감일: {activeItem.posting.deadline}
                                        </span>
                                    )}
                                </div>
                                <h2 className="mt-2 text-xl font-bold text-white tracking-tight">
                                    {activeItem.posting.companyName}
                                </h2>
                                <p className="text-sm font-medium text-zinc-300 mt-1">
                                    {activeItem.posting.positionTitle}
                                </p>
                            </div>

                            {/* 출퇴근 계산 요약 박스 */}
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                                <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                                        <Navigation className="h-4 w-4" />
                                        <span>예상 출퇴근 분석</span>
                                    </div>
                                    <span className="text-sm font-bold text-emerald-300">
                                        {activeItem.estimate?.formattedTimeText || '계산 대기'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300">
                                    <div>
                                        <span className="text-zinc-500">예상 경로 거리:</span>{' '}
                                        <strong>
                                            {activeItem.estimate?.estimatedDistanceKm ?? '-'} km
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500">직선 거리:</span>{' '}
                                        <strong>
                                            {activeItem.estimate?.straightDistanceKm ?? '-'} km
                                        </strong>
                                    </div>
                                </div>

                                <div className="text-[11px] text-zinc-400 bg-zinc-950/60 p-2 rounded-lg border border-zinc-800">
                                    📍 <strong>목적지:</strong>{' '}
                                    {activeItem.posting.location || '주소 미기재'}
                                </div>
                            </div>

                            {/* 세부 정보 요약 (연봉 / 근무 형태) */}
                            <div className="space-y-2.5 text-xs text-zinc-300 border-t border-b border-zinc-800 py-3">
                                {activeItem.posting.salaryNote && (
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-emerald-400 shrink-0" />
                                        <span>{activeItem.posting.salaryNote}</span>
                                    </div>
                                )}
                                {activeItem.posting.employmentType && (
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="h-4 w-4 text-indigo-400 shrink-0" />
                                        <span>{activeItem.posting.employmentType}</span>
                                    </div>
                                )}
                            </div>

                            {/* 외부 길찾기 웹 링크 연동 버튼 */}
                            <div className="space-y-2 pt-1">
                                <div className="text-xs font-medium text-zinc-400 mb-1">
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
                                        className="flex items-center justify-center gap-1.5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 py-2.5 text-xs font-semibold text-yellow-300 hover:bg-yellow-500/20 transition-colors"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
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
                                        className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        네이버 지도 길찾기
                                    </a>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="my-auto text-center text-zinc-500 text-xs">
                            지도의 마커나 공고 목록을 선택해 주세요.
                        </div>
                    )}

                    {/* 하단 상세보기 모달 호출 버튼 */}
                    {activeItem && (
                        <div className="pt-4 border-t border-zinc-800 mt-4">
                            <button
                                onClick={() => onSelectPosting(activeItem.posting)}
                                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                            >
                                <Building2 className="h-4 w-4" />
                                공고 상세 모달 열기
                            </button>
                        </div>
                    )}
                </div>
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
