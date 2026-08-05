'use client';

import React, { useState, useMemo } from 'react';
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

interface JobPostingMapViewProps {
    postings: JobPosting[];
    settings: JobPostingSetting | null;
    onUpdateSettings: (settings: JobPostingSetting) => void;
    onSelectPosting: (posting: JobPosting) => void;
}

type TimeFilterOption = 'ALL' | '30' | '45' | '60' | 'OVER_60';
type ViewModeOption = 'MAP_PIN' | 'CARD_GRID';

export default function JobPostingMapView({
    postings,
    settings,
    onUpdateSettings,
    onSelectPosting,
}: JobPostingMapViewProps) {
    const [isHomeModalOpen, setIsHomeModalOpen] = useState(false);
    const [timeFilter, setTimeFilter] = useState<TimeFilterOption>('ALL');
    const [viewMode, setViewMode] = useState<ViewModeOption>('MAP_PIN'); // 📍 지도 핀 뷰어 기본값
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

    // 지도 X,Y 상대 2D 공간 좌표 변환 연산 (내 집 기준 동서남북 핀 포지셔닝)
    const mapPinNodes = useMemo(() => {
        return filteredItems.map((item, idx) => {
            const lat = item.lat || homeLat;
            const lng = item.lng || homeLng;

            // 좌표 델타 (경도: X축, 위도: Y축 역방향)
            const dLng = lng - homeLng;
            const dLat = lat - homeLat;

            // 스케일링 팩터 (지도 캔버스 크기 대비 핀 배치)
            const scaleX = 400; // 경도 변화율 감도
            const scaleY = 450; // 위도 변화율 감도

            // 기본 50% 중심점에서 델타 좌표만큼 핀 위치 사상 (범위 12%~88% 내 클램핑)
            let posX = 50 + dLng * scaleX;
            let posY = 50 - dLat * scaleY;

            // 좌표 정보가 거의 동일하거나 중복 겹침 시 약간의 분산(Spiral Offset)
            const angle = (idx * 137.5 * Math.PI) / 180;
            const radius = (idx % 4) * 3.5;
            posX += Math.cos(angle) * radius;
            posY += Math.sin(angle) * radius;

            posX = Math.max(12, Math.min(88, posX));
            posY = Math.max(12, Math.min(88, posY));

            return {
                ...item,
                posX,
                posY,
            };
        });
    }, [filteredItems, homeLat, homeLng]);

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

                    {/* 📍 지도 핀 뷰 / 📇 매트릭스 뷰 전환 버튼 */}
                    <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                        <button
                            onClick={() => setViewMode('MAP_PIN')}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                viewMode === 'MAP_PIN'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            <MapIcon className="h-3.5 w-3.5" />
                            <span>📍 지도 핀 뷰</span>
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

            {/* 2. 메인 대시보드 뷰어 (지도 핀 캔버스 + 공고 상세 리스트 사이드바) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
                {/* 지도 시각화 캔버스 (Left 8 cols) */}
                <div className="relative lg:col-span-8 bg-zinc-950 overflow-hidden flex flex-col items-center justify-center p-4">
                    {/* Interactive Map Grid Canvas */}
                    <div className="relative w-full h-full rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-6 flex flex-col justify-between overflow-hidden">
                        {/* 지도 그리드 격자 패턴 배경 */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

                        {/* 🎯 직주근접 동심원 거리 반경 링 (10km / 20km / 30km) */}
                        {layerToggles.showDistanceRings && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30 z-0">
                                <div className="absolute w-[240px] h-[240px] rounded-full border border-dashed border-emerald-400 flex items-start justify-center pt-2">
                                    <span className="text-[10px] text-emerald-400 bg-zinc-950/80 px-1 rounded font-semibold">
                                        10 km (약 25분)
                                    </span>
                                </div>
                                <div className="absolute w-[440px] h-[440px] rounded-full border border-dashed border-indigo-400 flex items-start justify-center pt-2">
                                    <span className="text-[10px] text-indigo-400 bg-zinc-950/80 px-1 rounded font-semibold">
                                        20 km (약 45분)
                                    </span>
                                </div>
                                <div className="absolute w-[640px] h-[640px] rounded-full border border-dashed border-amber-400 flex items-start justify-center pt-2">
                                    <span className="text-[10px] text-amber-400 bg-zinc-950/80 px-1 rounded font-semibold">
                                        30 km (약 60분)
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* 상단 레이어 바 */}
                        <div className="z-20 flex items-start justify-between">
                            {/* 내 집 핀 라벨 */}
                            {layerToggles.showHomePin && (
                                <div className="flex items-center gap-2 rounded-xl bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 backdrop-blur-md shadow-lg">
                                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                                    <span className="font-semibold text-emerald-400">
                                        🏠 내 집 출발점
                                    </span>
                                    <span className="text-zinc-500">|</span>
                                    <span className="text-zinc-300 max-w-[240px] truncate">
                                        {homeAddress}
                                    </span>
                                </div>
                            )}

                            {/* 🧠 마인드맵 스타일 특정 요소 껐다 켰다(Toggle) 컨트롤 패널 */}
                            <div className="relative ml-auto">
                                <button
                                    onClick={() => setIsLayerControlOpen(!isLayerControlOpen)}
                                    className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 backdrop-blur-md transition-all shadow-md"
                                >
                                    <Layers className="h-3.5 w-3.5 text-indigo-400" />
                                    <span>마인드맵 레이어 토글</span>
                                    <span className="rounded bg-indigo-500/20 px-1 text-[10px]">
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

                        {/* 3. 📍 지도 마커 핀 시각화 영역 vs 📇 매트릭스 그리드 영역 */}
                        {viewMode === 'MAP_PIN' ? (
                            /* [MODE 1] 📍 진짜 지도 공간 기반 마커 핀 뷰어 Canvas */
                            <div className="relative z-10 w-full h-[400px] my-auto overflow-hidden">
                                {/* 🏠 중앙 내 집 마커 (Center Home Pin) */}
                                {layerToggles.showHomePin && (
                                    <div
                                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center group cursor-pointer"
                                        onClick={() => setIsHomeModalOpen(true)}
                                    >
                                        <div className="relative flex items-center justify-center">
                                            <div className="absolute h-10 w-10 rounded-full bg-emerald-500/30 animate-ping" />
                                            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 font-bold shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-500/20">
                                                <Home className="h-5 w-5" />
                                            </div>
                                        </div>
                                        <div className="mt-1.5 rounded-lg border border-emerald-500/40 bg-zinc-900/90 px-2.5 py-1 text-[11px] font-bold text-emerald-300 shadow-md backdrop-blur-md">
                                            🏠 내 집 출발점
                                        </div>
                                    </div>
                                )}

                                {/* 📍 채용 공고 마커 핀 노드들 (Interactive Map Pins) */}
                                {mapPinNodes.length === 0 ? (
                                    <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500">
                                        선택된 조건에 부합하는 공고 핀이 없습니다.
                                    </div>
                                ) : (
                                    mapPinNodes.map(({ posting, estimate, posX, posY }) => {
                                        const isSelected = activeItem?.posting.id === posting.id;
                                        const mins = estimate?.estimatedMinutes || 0;

                                        // 소요시간별 핀 컬러 테마
                                        let pinBg = 'bg-emerald-500 text-zinc-950';
                                        let pinRing = 'ring-emerald-500/30';
                                        let badgeStyle =
                                            'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

                                        if (mins > 60) {
                                            pinBg = 'bg-rose-500 text-white';
                                            pinRing = 'ring-rose-500/30';
                                            badgeStyle =
                                                'bg-rose-500/20 text-rose-300 border-rose-500/40';
                                        } else if (mins > 45) {
                                            pinBg = 'bg-amber-500 text-zinc-950';
                                            pinRing = 'ring-amber-500/30';
                                            badgeStyle =
                                                'bg-amber-500/20 text-amber-300 border-amber-500/40';
                                        } else if (mins > 30) {
                                            pinBg = 'bg-indigo-500 text-white';
                                            pinRing = 'ring-indigo-500/30';
                                            badgeStyle =
                                                'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
                                        }

                                        return (
                                            <div
                                                key={posting.id}
                                                style={{ left: `${posX}%`, top: `${posY}%` }}
                                                onClick={() => setSelectedPostingId(posting.id)}
                                                className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-10 hover:z-30 cursor-pointer ${
                                                    isSelected
                                                        ? 'z-30 scale-125'
                                                        : 'hover:scale-110'
                                                }`}
                                            >
                                                {/* 핀 호버/클릭 시 표출되는 커스텀 팝업 인포윈도우 Card */}
                                                {isSelected && (
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-xl border border-zinc-700 bg-zinc-900/95 p-2.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 z-40 text-left">
                                                        <div className="text-[11px] font-bold text-white truncate">
                                                            {posting.companyName}
                                                        </div>
                                                        <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                                                            {posting.positionTitle}
                                                        </div>
                                                        <div className="mt-1.5 flex items-center justify-between border-t border-zinc-800 pt-1 text-[10px]">
                                                            <span className="font-semibold text-emerald-400">
                                                                ⏱️{' '}
                                                                {estimate?.formattedTimeText ||
                                                                    '시간 미상'}
                                                            </span>
                                                            <span className="text-zinc-500">
                                                                {estimate?.estimatedDistanceKm ??
                                                                    '-'}{' '}
                                                                km
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 📍 마커 핀 아이콘 & Glowing Ring */}
                                                <div className="flex flex-col items-center group">
                                                    <div className="relative flex items-center justify-center">
                                                        {isSelected && (
                                                            <div className="absolute h-8 w-8 rounded-full bg-indigo-500/40 animate-ping" />
                                                        )}
                                                        <div
                                                            className={`relative flex h-7 w-7 items-center justify-center rounded-full font-bold shadow-lg ring-4 ${pinBg} ${pinRing}`}
                                                        >
                                                            <MapPin className="h-4 w-4 fill-current stroke-[2]" />
                                                        </div>
                                                    </div>

                                                    {/* 마커 뱃지 라벨 (회사명 + 소요시간) */}
                                                    {layerToggles.showPinLabels && (
                                                        <div
                                                            className={`mt-1 flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold shadow-md backdrop-blur-md whitespace-nowrap transition-all ${badgeStyle} ${
                                                                isSelected
                                                                    ? 'ring-1 ring-white/40 scale-105'
                                                                    : ''
                                                            }`}
                                                        >
                                                            <span className="truncate max-w-[80px]">
                                                                {posting.companyName}
                                                            </span>
                                                            <span>
                                                                {estimate?.formattedTimeText || ''}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        ) : (
                            /* [MODE 2] 📇 카드 매트릭스 그리드 뷰어 */
                            <div className="z-10 my-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto max-h-[360px] p-2">
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
                        <div className="z-10 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-3 text-[11px] text-zinc-500">
                            <span>
                                💡 마커 핀을 클릭하면 상세 길찾기 URL과 지원 공고 정보가 표기됩니다.
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
