'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import {
    AI_PROCESSING_CONSENT_REQUIRED_EVENT,
    AI_PROCESSING_POLICY_VERSION,
    acceptAiProcessingConsent,
} from '@/lib/aiProcessingConsent';

export function AiProcessingConsentDialog() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const show = () => setOpen(true);
        window.addEventListener(AI_PROCESSING_CONSENT_REQUIRED_EVENT, show);
        return () => window.removeEventListener(AI_PROCESSING_CONSENT_REQUIRED_EVENT, show);
    }, []);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-processing-consent-title"
        >
            <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
                <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                    <div className="flex gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 text-slate-700" />
                        <div>
                            <h2
                                id="ai-processing-consent-title"
                                className="font-black text-slate-950"
                            >
                                AI 처리 내용을 확인해 주세요
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                정책 버전 {AI_PROCESSING_POLICY_VERSION}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                        aria-label="닫기"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="space-y-4 px-5 py-5 text-sm leading-6 text-slate-700">
                    <p>
                        선택한 경험·학습·역량·지원 자료와 작성 지시가 Workspace의 허용 Provider로
                        전송됩니다. 이메일, 전화번호, 주소, 인증정보와 Secret은 전송 대상이
                        아닙니다.
                    </p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li>현재 처리 경로와 Provider는 Workspace 요금제 화면에서 확인합니다.</li>
                        <li>
                            Prompt, Evidence Packet과 Provider 원문 응답은 사용량 원장에 저장하지
                            않습니다.
                        </li>
                        <li>실행 전 예상 point를 예약하고 실패하면 반환합니다.</li>
                        <li>BYOK가 실패해도 플랫폼 key로 자동 전환하지 않습니다.</li>
                    </ul>
                    <p className="text-xs text-slate-500">
                        확인 기록은 사용자·Workspace·목적·Provider·region·정책 버전 단위로 남습니다.
                    </p>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700"
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            acceptAiProcessingConsent();
                            setOpen(false);
                        }}
                        className="min-h-11 rounded-lg bg-slate-950 px-4 text-sm font-black text-white"
                    >
                        내용을 확인했습니다
                    </button>
                </div>
            </div>
        </div>
    );
}
