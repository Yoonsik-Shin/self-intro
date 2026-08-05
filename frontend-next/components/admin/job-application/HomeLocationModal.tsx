'use client';

import React, { useState } from 'react';
import { Home, MapPin, X } from 'lucide-react';
import { jobPostingApi } from '@/lib/api/jobPosting';
import type { JobPostingSetting } from '@/lib/api/types';

interface HomeLocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: JobPostingSetting | null;
    onSuccess: (updated: JobPostingSetting) => void;
}

// 주요 도시/지역 기본 좌표 맵 (지오코딩 전 즉시 빠른 선택 지원)
const PRESET_LOCATIONS = [
    {
        name: '서울 마포구 (상암/합정)',
        address: '서울특별시 마포구 월드컵북로 400',
        lat: 37.5796,
        lng: 126.8899,
    },
    {
        name: '서울 강남구 (강남역/역삼)',
        address: '서울특별시 강남구 테헤란로 152',
        lat: 37.5006,
        lng: 127.0365,
    },
    {
        name: '서울 영등포구 (여의도)',
        address: '서울특별시 영등포구 여의대로 108',
        lat: 37.5255,
        lng: 126.9255,
    },
    {
        name: '서울 성동구 (성수)',
        address: '서울특별시 성동구 아차산로 113',
        lat: 37.5447,
        lng: 127.056,
    },
    {
        name: '경기 성남시 (판교)',
        address: '서울특별시 분당구 판교역로 160',
        lat: 37.3948,
        lng: 127.1112,
    },
];

export default function HomeLocationModal({
    isOpen,
    onClose,
    settings,
    onSuccess,
}: HomeLocationModalProps) {
    const [address, setAddress] = useState(settings?.homeAddress || '');
    const [latitude, setLatitude] = useState<string>(
        settings?.homeLatitude ? String(settings.homeLatitude) : ''
    );
    const [longitude, setLongitude] = useState<string>(
        settings?.homeLongitude ? String(settings.homeLongitude) : ''
    );
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSelectPreset = (preset: (typeof PRESET_LOCATIONS)[0]) => {
        setAddress(preset.address);
        setLatitude(String(preset.lat));
        setLongitude(String(preset.lng));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!address.trim()) {
            setErrorMsg('집 주소를 입력해주세요.');
            return;
        }

        const latNum = parseFloat(latitude);
        const lngNum = parseFloat(longitude);

        if (isNaN(latNum) || isNaN(lngNum)) {
            setErrorMsg('위도와 경도 좌표 값을 확인해주세요.');
            return;
        }

        try {
            setIsSaving(true);
            setErrorMsg(null);

            // 기존 설정 값 가져와서 집 위치 필드 업데이트
            const currentSettings = settings || (await jobPostingApi.getSettings());
            const updated = await jobPostingApi.updateSettings({
                ...currentSettings,
                homeAddress: address.trim(),
                homeLatitude: latNum,
                homeLongitude: lngNum,
            });

            onSuccess(updated);
            onClose();
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : '집 위치 저장 중 오류가 발생했습니다.';
            setErrorMsg(message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Home className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">내 집 위치 설정</h3>
                            <p className="text-xs text-zinc-400">
                                출퇴근 시간을 계산할 기준 주소를 지정합니다.
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

                <form onSubmit={handleSave} className="mt-4 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                            주요 지역 빠른 선택
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {PRESET_LOCATIONS.map((preset) => (
                                <button
                                    key={preset.name}
                                    type="button"
                                    onClick={() => handleSelectPreset(preset)}
                                    className="rounded-lg border border-zinc-800 bg-zinc-800/60 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                                >
                                    📍 {preset.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                            집 주소 (도로명/지번)
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="예: 서울특별시 마포구 월드컵북로..."
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 pl-9 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                required
                            />
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-zinc-300 mb-1">
                                위도 (Latitude)
                            </label>
                            <input
                                type="number"
                                step="any"
                                value={latitude}
                                onChange={(e) => setLatitude(e.target.value)}
                                placeholder="예: 37.5796"
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-300 mb-1">
                                경도 (Longitude)
                            </label>
                            <input
                                type="number"
                                step="any"
                                value={longitude}
                                onChange={(e) => setLongitude(e.target.value)}
                                placeholder="예: 126.8899"
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                                required
                            />
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
                            {errorMsg}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-600/20"
                        >
                            {isSaving ? '저장 중...' : '저장하기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
