'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Heart, X } from 'lucide-react';
import { donationApi } from '@/lib/api';

type DonationModalProps = {
    onClose: () => void;
};

export function DonationModal({ onClose }: DonationModalProps) {
    const [kofiUrl, setKofiUrl] = useState<string>('https://ko-fi.com');
    const [phase, setPhase] = useState<'info' | 'redirected'>('info');

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const config = await donationApi.config();
                if (config.kofiPageUrl) {
                    setKofiUrl(config.kofiPageUrl);
                }
            } catch {
                // 기본값 사용
            }
        };
        fetchConfig();
    }, []);

    useEffect(() => {
        const handleKeydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeydown);
        return () => window.removeEventListener('keydown', handleKeydown);
    }, [onClose]);

    const handleOpenKofi = () => {
        window.open(kofiUrl, '_blank', 'noopener,noreferrer');
        setPhase('redirected');
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 print:hidden"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-label="후원하기"
        >
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                        <Heart className="h-5 w-5 text-rose-500" />
                        후원하기
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label="닫기"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {phase === 'info' ? (
                    <div className="mt-4 flex flex-col gap-4">
                        <p className="text-sm leading-relaxed text-slate-600">
                            작은 후원이 큰 힘이 됩니다! 💙
                            <br />
                            후원은{' '}
                            <strong className="font-semibold text-blue-600">Ko-fi (PayPal)</strong>
                            를 통해 안전하게 진행하실 수 있습니다.
                        </p>

                        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900 leading-relaxed">
                            💡 버튼을 누르면 Ko-fi 후원 페이지로 이동합니다. PayPal 또는 카드로 쉽고
                            편리하게 마음을 전해보세요.
                        </div>

                        <button
                            onClick={handleOpenKofi}
                            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Ko-fi에서 후원하기
                        </button>
                    </div>
                ) : (
                    <div className="mt-6 flex flex-col items-center gap-4 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <Heart className="h-6 w-6 fill-blue-600" />
                        </div>
                        <div className="text-sm text-slate-600 leading-relaxed">
                            <p className="font-extrabold text-slate-900 text-base">
                                Ko-fi 후원 페이지가 열렸습니다!
                            </p>
                            <p className="mt-1 text-xs">
                                후원을 완료하시면 백엔드 DB로 소중한 후원 이력이 자동 기록됩니다.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="h-10 w-full rounded-xl bg-slate-900 text-sm font-extrabold text-white transition hover:bg-slate-700"
                        >
                            확인 (닫기)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
