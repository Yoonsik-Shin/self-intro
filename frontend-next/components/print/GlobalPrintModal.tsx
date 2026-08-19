'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { bffApi } from '@/lib/api';
import { usePrintStore } from '@/store/usePrintStore';
import { PrintModeModal } from './PrintModeModal';

const PrintCanvas = dynamic(() => import('./PrintCanvas').then((mod) => mod.PrintCanvas), {
    ssr: false,
});

/** 헤더의 "PDF 인쇄" 버튼에서 즉시 띄우는 모달. 공개 워크스페이스 방문자는 워크스페이스
 *  주인이 공개해 둔 서버 템플릿만 고를 수 있고(restricted), 고르면 페이지 이동 없이 이
 *  화면 위에 PrintCanvas를 잠깐 숨겨 띄워 인쇄 대화상자만 띄우고 스스로 사라진다. */
export function GlobalPrintModal({ workspaceSlug }: { workspaceSlug: string }) {
    const open = usePrintStore((s) => s.printModalOpen);
    const setPrintModalOpen = usePrintStore((s) => s.setPrintModalOpen);
    const applyTemplate = usePrintStore((s) => s.applyTemplate);
    const setAutoPrintRequested = usePrintStore((s) => s.setAutoPrintRequested);
    const [quickPrintOpen, setQuickPrintOpen] = useState(false);

    // 인쇄용 콘텐츠는 웹 화면(channel=WEB)과 다른 채널(RESUME)이라 별도로 받아야 한다.
    // 모달이 열리는 즉시 미리 가져와, 템플릿을 고르는 순간 바로 인쇄로 넘어갈 수 있게 한다.
    const { data: resumeIntroData, isError: isResumeIntroError } = useQuery({
        queryKey: ['workspaceIntroduction', workspaceSlug, 'RESUME'],
        queryFn: () => bffApi.getWorkspaceIntroduction(workspaceSlug, 'RESUME'),
        enabled: open || quickPrintOpen,
        staleTime: 5 * 60 * 1000,
    });

    return (
        <>
            <PrintModeModal
                open={open}
                onClose={() => setPrintModalOpen(false)}
                onManual={() => setPrintModalOpen(false)}
                onApplyTemplate={(settings) => {
                    applyTemplate(settings);
                    setAutoPrintRequested(true);
                    setPrintModalOpen(false);
                    setQuickPrintOpen(true);
                }}
                workspaceSlug={workspaceSlug}
                restricted
            />
            {quickPrintOpen && resumeIntroData?.profile && (
                <div className="fixed inset-0 z-[1000]">
                    <PrintCanvas
                        workspaceSlug={workspaceSlug}
                        introData={resumeIntroData}
                        adminMode={false}
                        quickPrintMode
                        onExit={() => setQuickPrintOpen(false)}
                    />
                </div>
            )}
            {quickPrintOpen && !resumeIntroData?.profile && !isResumeIntroError && (
                <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-3 bg-slate-950 text-white">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-white" />
                    <p className="text-sm font-bold">PDF 인쇄를 준비하는 중입니다…</p>
                </div>
            )}
            {quickPrintOpen && isResumeIntroError && (
                <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-4 bg-slate-950 text-white">
                    <p className="text-sm font-bold text-rose-300">
                        인쇄용 콘텐츠를 불러오지 못했습니다.
                    </p>
                    <button
                        type="button"
                        onClick={() => setQuickPrintOpen(false)}
                        className="rounded-md border border-slate-600 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
                    >
                        닫기
                    </button>
                </div>
            )}
        </>
    );
}
