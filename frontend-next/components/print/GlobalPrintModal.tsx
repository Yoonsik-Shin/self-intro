'use client';

import { useRouter } from 'next/navigation';
import { usePrintStore } from '@/store/usePrintStore';
import { PrintModeModal } from './PrintModeModal';

/** 헤더의 "PDF 인쇄" 버튼에서 즉시 띄우는 모달. 현재 페이지를 벗어나지 않고 뜨며,
 *  사용자가 모드를 선택한 뒤에야 Workspace 인쇄 route로 이동한다. */
export function GlobalPrintModal({ workspaceSlug }: { workspaceSlug: string }) {
    const router = useRouter();
    const open = usePrintStore((s) => s.printModalOpen);
    const setPrintModalOpen = usePrintStore((s) => s.setPrintModalOpen);
    const resetManual = usePrintStore((s) => s.resetManual);
    const applyTemplate = usePrintStore((s) => s.applyTemplate);

    return (
        <PrintModeModal
            open={open}
            onClose={() => setPrintModalOpen(false)}
            onManual={() => {
                resetManual();
                setPrintModalOpen(false);
                router.push(`/workspace/${encodeURIComponent(workspaceSlug)}/print`);
            }}
            onApplyTemplate={(settings) => {
                applyTemplate(settings);
                setPrintModalOpen(false);
                router.push(`/workspace/${encodeURIComponent(workspaceSlug)}/print`);
            }}
            workspaceSlug={workspaceSlug}
        />
    );
}
