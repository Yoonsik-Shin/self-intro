'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Home,
    MapPin,
    X,
    Search,
    Sparkles,
    Loader2,
    CheckCircle2,
    ExternalLink,
} from 'lucide-react';
import type { JobMapLocationSetting, JobMapLocationSettingRequest } from '@/lib/api/types';
import {
    openDaumPostcodeSearch,
    embedDaumPostcodeSearch,
    geocodeAddressClient,
    DaumPostcodeData,
} from '@/lib/utils/daumPostcode';

interface HomeLocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings:
        | Pick<JobMapLocationSetting, 'homeAddress' | 'homeLatitude' | 'homeLongitude'>
        | {
              homeAddress?: string | null;
              homeLatitude?: number | null;
              homeLongitude?: number | null;
          }
        | null;
    onSuccess: (updated: JobMapLocationSettingRequest) => void | Promise<void>;
}

export default function HomeLocationModal({
    isOpen,
    onClose,
    settings,
    onSuccess,
}: HomeLocationModalProps) {
    const [address, setAddress] = useState(settings?.homeAddress || '');
    const [latitude, setLatitude] = useState<number>(settings?.homeLatitude ?? 0);
    const [longitude, setLongitude] = useState<number>(settings?.homeLongitude ?? 0);

    const [isSaving, setIsSaving] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [isInlineSearchOpen, setIsInlineSearchOpen] = useState(false);
    const [activeSearchQuery, setActiveSearchQuery] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const embedContainerRef = useRef<HTMLDivElement>(null);

    // 모달 오픈 시 초기화
    useEffect(() => {
        if (isOpen) {
            // 모달을 다시 열 때 마지막 저장값으로 일회성 편집 상태를 초기화한다.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAddress(settings?.homeAddress || '');
            setLatitude(settings?.homeLatitude ?? 0);
            setLongitude(settings?.homeLongitude ?? 0);
            setIsInlineSearchOpen(false);
            setActiveSearchQuery('');
            setErrorMsg(null);
        }
    }, [isOpen, settings]);

    // 주소 선택 시 처리 (도로명 주소 세팅 + 위도/경도 자동 산출)
    const handleAddressSelected = useCallback(async (data: DaumPostcodeData) => {
        const selectedAddr = data.roadAddress || data.address;
        setAddress(selectedAddr);
        setLatitude(0);
        setLongitude(0);
        setIsInlineSearchOpen(false);

        // 도로명 주소 선택 직후 좌표 실시간 자동 계산
        setIsGeocoding(true);
        setErrorMsg(null);
        const coords = await geocodeAddressClient(selectedAddr);
        setIsGeocoding(false);

        if (coords) {
            setLatitude(coords.lat);
            setLongitude(coords.lng);
        } else {
            const fallbackCoords = await geocodeAddressClient(data.sido + ' ' + data.sigungu);
            if (fallbackCoords) {
                setLatitude(fallbackCoords.lat);
                setLongitude(fallbackCoords.lng);
            }
        }
    }, []);

    // 팝업 방식 주소 검색 (작성된 주소를 q 파라미터로 넘겨 팝업창 오픈)
    const openPopupSearch = useCallback(async () => {
        try {
            setErrorMsg(null);
            await openDaumPostcodeSearch((data) => {
                handleAddressSelected(data);
            }, address.trim());
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : '도로명 주소 검색 팝업을 열지 못했습니다.';
            setErrorMsg(message);
        }
    }, [address, handleAddressSelected]);

    // 인라인 카카오 주소 검색 창 임베드 (activeSearchQuery를 q 파라미터로 매개변수에 직주입)
    useEffect(() => {
        if (isInlineSearchOpen && embedContainerRef.current) {
            embedDaumPostcodeSearch(
                embedContainerRef.current,
                handleAddressSelected,
                activeSearchQuery
            ).catch((err) => {
                console.warn('Embed search failed, falling back to popup:', err);
                openPopupSearch();
            });
        }
    }, [isInlineSearchOpen, activeSearchQuery, handleAddressSelected, openPopupSearch]);

    if (!isOpen) return null;

    // 작성한 내용이 이미 있으므로 [주소검색] 누르면 입력 주소를 q 키워드로 전달하여 인라인 검색 영역 오픈
    const handleSearchClick = () => {
        const queryToSearch = address.trim();
        setActiveSearchQuery(queryToSearch);
        setIsInlineSearchOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!address.trim()) {
            setErrorMsg('기준 주소를 입력해주세요.');
            return;
        }

        try {
            setIsSaving(true);
            setErrorMsg(null);

            // 주소 저장을 진행하기 전 위도/경도 자동 계산 재검증
            let finalLat = latitude;
            let finalLng = longitude;
            if (!finalLat || !finalLng) {
                const coords = await geocodeAddressClient(address);
                if (coords) {
                    finalLat = coords.lat;
                    finalLng = coords.lng;
                } else {
                    setErrorMsg(
                        '주소의 위치를 확인하지 못했습니다. 주소 검색 결과를 선택해주세요.'
                    );
                    return;
                }
            }

            await onSuccess({
                homeAddress: address.trim(),
                homeLatitude: finalLat,
                homeLongitude: finalLng,
            });
            onClose();
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : '기준 위치 저장 중 오류가 발생했습니다.';
            setErrorMsg(message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100 animate-in zoom-in-95 duration-200">
                {/* 헤더 */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                            <Home className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-white">기준 위치 설정</h3>
                            <p className="text-xs text-zinc-400">
                                작성한 주소를 기반으로 도로명 주소와 위도·경도가 100% 자동
                                산출됩니다.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="mt-5 space-y-4">
                    {/* 주소 입력 & 검색 버튼 컴포넌트 */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-zinc-300">
                                기준 주소 (도로명/지번)
                            </label>
                            {address.trim() && (
                                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                                    <Sparkles className="h-3 w-3" />
                                    위경도 자동 산출
                                </span>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => {
                                        setAddress(e.target.value);
                                        setLatitude(0);
                                        setLongitude(0);
                                        if (isInlineSearchOpen) setIsInlineSearchOpen(false);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSearchClick();
                                        }
                                    }}
                                    placeholder="예: 경기도 성남시 분당구 판교로25번길..."
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 pl-9 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-inner"
                                    required
                                />
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                            </div>

                            <button
                                type="button"
                                onClick={handleSearchClick}
                                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all shrink-0 shadow-sm"
                            >
                                <Search className="h-4 w-4" />
                                주소검색
                            </button>
                        </div>
                    </div>

                    {/* 에러 메시지 알림 */}
                    {errorMsg && (
                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                            ⚠️ {errorMsg}
                        </div>
                    )}

                    {/* 인라인 카카오 도로명 주소 검색 뷰어 (작성한 내용이 자동으로 들어가서 바로 결과 표출) */}
                    {isInlineSearchOpen && (
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-inner">
                            <div className="flex items-center justify-between bg-zinc-800/80 px-4 py-2 text-xs font-semibold text-zinc-300 border-b border-zinc-700/60">
                                <span className="flex items-center gap-1.5">
                                    <Search className="h-3.5 w-3.5 text-emerald-400" />
                                    {activeSearchQuery
                                        ? `"${activeSearchQuery}" 검색 결과`
                                        : '카카오 도로명 주소 검색'}
                                </span>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={openPopupSearch}
                                        className="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                                    >
                                        <ExternalLink className="h-3 w-3" />새 창 팝업으로 검색
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsInlineSearchOpen(false)}
                                        className="text-zinc-400 hover:text-white"
                                    >
                                        닫기
                                    </button>
                                </div>
                            </div>
                            <div
                                ref={embedContainerRef}
                                className="w-full h-[340px] bg-white text-black"
                            />
                        </div>
                    )}

                    {/* 지오코딩 자동 처리 로딩 및 안내 상태 뱃지 */}
                    {isGeocoding && (
                        <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-300">
                            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                            <span>
                                도로명 주소 기반으로 위도·경도 좌표를 자동 계산하고 있습니다...
                            </span>
                        </div>
                    )}

                    {/* 하단 저장 및 취소 버튼 */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || isGeocoding}
                            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>저장 중...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>기준 위치 저장</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
