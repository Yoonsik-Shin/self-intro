'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Heart, Loader2, X } from 'lucide-react';
import { ApiError, donationApi } from '@/lib/api';

const PRESET_AMOUNTS = [1000, 3000, 5000];
const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 100000;
const POLL_INTERVAL_MS = 2500;
const POPUP_CLOSED_GRACE_MS = 10_000;
const HARD_TIMEOUT_MS = 5 * 60 * 1000;

type Phase =
    | 'select'
    | 'creating'
    | 'waiting'
    | 'success'
    | 'canceled'
    | 'failed'
    | 'popupBlocked'
    | 'timeout';

type DonationModalProps = {
    onClose: () => void;
};

export function DonationModal({ onClose }: DonationModalProps) {
    const [phase, setPhase] = useState<Phase>('select');
    const [selectedPreset, setSelectedPreset] = useState<number | null>(PRESET_AMOUNTS[1]);
    const [customAmount, setCustomAmount] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [donationToken, setDonationToken] = useState<string | null>(null);
    const [payUrl, setPayUrl] = useState<string | null>(null);
    const popupRef = useRef<Window | null>(null);

    const amount = selectedPreset ?? Number.parseInt(customAmount, 10);
    const amountValid = Number.isFinite(amount) && amount >= MIN_AMOUNT && amount <= MAX_AMOUNT;
    const closable = phase !== 'creating';

    useEffect(() => {
        const handleKeydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && closable) onClose();
        };
        window.addEventListener('keydown', handleKeydown);
        return () => window.removeEventListener('keydown', handleKeydown);
    }, [closable, onClose]);

    // 결제 완료 폴링: PAID/CANCELED/FAILED 전환 감지, 팝업 닫힘 후 10초 유예, 5분 하드 타임아웃
    useEffect(() => {
        if (phase !== 'waiting' || !donationToken) return;
        const startedAt = Date.now();
        let popupClosedAt: number | null = null;
        let stopped = false;

        const interval = window.setInterval(async () => {
            const popup = popupRef.current;
            if (popup?.closed && popupClosedAt === null) popupClosedAt = Date.now();

            try {
                const { status } = await donationApi.status(donationToken);
                if (stopped) return;
                if (status === 'PAID') {
                    popupRef.current?.close();
                    setPhase('success');
                    return;
                }
                if (status === 'CANCELED') {
                    popupRef.current?.close();
                    setPhase('canceled');
                    return;
                }
                if (status === 'FAILED') {
                    popupRef.current?.close();
                    setPhase('failed');
                    return;
                }
            } catch {
                // 일시적인 네트워크 오류는 다음 폴링에서 다시 시도
            }
            if (popupClosedAt !== null && Date.now() - popupClosedAt > POPUP_CLOSED_GRACE_MS) {
                setPhase('timeout');
                return;
            }
            if (Date.now() - startedAt > HARD_TIMEOUT_MS) {
                // 결제창은 닫지 않는다 — 뒤늦게 결제해도 콜백으로 정상 기록된다
                setPhase('timeout');
            }
        }, POLL_INTERVAL_MS);

        return () => {
            stopped = true;
            window.clearInterval(interval);
        };
    }, [phase, donationToken]);

    const submit = async () => {
        if (!amountValid) {
            setError(
                `후원 금액은 ${MIN_AMOUNT.toLocaleString()}원 이상 ${MAX_AMOUNT.toLocaleString()}원 이하로 입력해주세요.`
            );
            return;
        }
        // 팝업 차단을 피하려면 클릭 핸들러 안에서 동기적으로 창을 먼저 열어야 한다
        const popup = window.open('', 'payapp', 'width=420,height=640');
        setPhase('creating');
        setError(null);
        try {
            const response = await donationApi.create(amount, message.trim() || undefined);
            setDonationToken(response.donationToken);
            setPayUrl(response.payUrl);
            if (popup && !popup.closed) {
                popup.location.href = response.payUrl;
                popupRef.current = popup;
                setPhase('waiting');
            } else {
                setPhase('popupBlocked');
            }
        } catch (submitError) {
            popup?.close();
            setError(
                submitError instanceof ApiError
                    ? submitError.message
                    : '후원 요청에 실패했습니다. 잠시 후 다시 시도해주세요.'
            );
            setPhase('select');
        }
    };

    const retry = () => {
        popupRef.current = null;
        setDonationToken(null);
        setPayUrl(null);
        setError(null);
        setPhase('select');
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 print:hidden"
            onClick={(event) => {
                if (event.target === event.currentTarget && closable) onClose();
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
                    {closable && (
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            aria-label="닫기"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {phase === 'select' && (
                    <div className="mt-4 flex flex-col gap-4">
                        <p className="text-sm text-slate-500">
                            작은 후원이 큰 힘이 됩니다. 결제는 페이앱 창에서 안전하게 진행됩니다.
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {PRESET_AMOUNTS.map((preset) => (
                                <button
                                    key={preset}
                                    onClick={() => {
                                        setSelectedPreset(preset);
                                        setCustomAmount('');
                                    }}
                                    className={`rounded-xl border px-3 py-2 text-sm font-extrabold transition ${
                                        selectedPreset === preset
                                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    {preset.toLocaleString()}원
                                </button>
                            ))}
                        </div>
                        <input
                            type="number"
                            inputMode="numeric"
                            min={MIN_AMOUNT}
                            max={MAX_AMOUNT}
                            step={100}
                            value={customAmount}
                            onChange={(event) => {
                                setCustomAmount(event.target.value);
                                setSelectedPreset(null);
                            }}
                            placeholder={`직접 입력 (${MIN_AMOUNT.toLocaleString()}~${MAX_AMOUNT.toLocaleString()}원)`}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500"
                        />
                        <input
                            type="text"
                            maxLength={200}
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            placeholder="응원 메시지 (선택)"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500"
                        />
                        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
                        <button
                            onClick={submit}
                            disabled={!amountValid}
                            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                        >
                            <Heart className="h-4 w-4" />
                            {amountValid ? `${amount.toLocaleString()}원 후원하기` : '후원하기'}
                        </button>
                    </div>
                )}

                {phase === 'creating' && (
                    <div className="mt-8 flex flex-col items-center gap-3 pb-4 text-sm text-slate-500">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        결제를 준비하고 있습니다…
                    </div>
                )}

                {phase === 'waiting' && (
                    <div className="mt-8 flex flex-col items-center gap-3 pb-4 text-center text-sm text-slate-500">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <p>
                            결제창에서 결제를 진행해주세요.
                            <br />
                            완료되면 이 화면이 자동으로 갱신됩니다.
                        </p>
                    </div>
                )}

                {phase === 'popupBlocked' && payUrl && (
                    <div className="mt-6 flex flex-col items-center gap-4 pb-2 text-center text-sm text-slate-600">
                        <AlertTriangle className="h-8 w-8 text-amber-500" />
                        <p>브라우저가 결제창 팝업을 차단했습니다. 아래 버튼으로 직접 열어주세요.</p>
                        <a
                            href={payUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setPhase('waiting')}
                            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white transition hover:bg-blue-700"
                        >
                            <ExternalLink className="h-4 w-4" />
                            결제창 열기
                        </a>
                    </div>
                )}

                {phase === 'success' && (
                    <div className="mt-6 flex flex-col items-center gap-4 pb-2 text-center">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                        <div className="text-sm text-slate-600">
                            <p className="text-base font-black text-slate-900">
                                후원해주셔서 진심으로 감사합니다! 💙
                            </p>
                            <p className="mt-1">
                                보내주신 응원을 큰 힘 삼아 더 좋은 개발자가 되겠습니다.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="h-10 w-full rounded-xl bg-slate-900 text-sm font-extrabold text-white transition hover:bg-slate-700"
                        >
                            닫기
                        </button>
                    </div>
                )}

                {phase === 'canceled' && (
                    <div className="mt-6 flex flex-col items-center gap-4 pb-2 text-center text-sm text-slate-600">
                        <AlertTriangle className="h-8 w-8 text-amber-500" />
                        <p>결제가 취소되었습니다.</p>
                        <button
                            onClick={retry}
                            className="h-10 w-full rounded-xl border border-slate-200 text-sm font-extrabold text-slate-600 transition hover:border-slate-300"
                        >
                            다시 시도
                        </button>
                    </div>
                )}

                {phase === 'failed' && (
                    <div className="mt-6 flex flex-col items-center gap-4 pb-2 text-center text-sm text-slate-600">
                        <AlertTriangle className="h-8 w-8 text-rose-500" />
                        <p>결제 처리에 실패했습니다. 잠시 후 다시 시도해주세요.</p>
                        <button
                            onClick={retry}
                            className="h-10 w-full rounded-xl border border-slate-200 text-sm font-extrabold text-slate-600 transition hover:border-slate-300"
                        >
                            다시 시도
                        </button>
                    </div>
                )}

                {phase === 'timeout' && (
                    <div className="mt-6 flex flex-col items-center gap-4 pb-2 text-center text-sm text-slate-600">
                        <AlertTriangle className="h-8 w-8 text-amber-500" />
                        <p>
                            결제 완료가 확인되지 않았습니다.
                            <br />
                            결제를 마치셨다면 잠시 후 자동으로 반영됩니다.
                        </p>
                        <button
                            onClick={retry}
                            className="h-10 w-full rounded-xl border border-slate-200 text-sm font-extrabold text-slate-600 transition hover:border-slate-300"
                        >
                            다시 시도
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
