'use client';

import { useRouter } from 'next/navigation';
import { usePrintStore } from '@/store/usePrintStore';
import { PrintModeModal } from './PrintModeModal';

/** 헤더의 "PDF 인쇄" 버튼에서 즉시 띄우는 모달. 현재 페이지를 벗어나지 않고 뜨며,
 *  사용자가 모드를 선택한 뒤에야 /print로 이동한다 (원본이 페이지 이동 없이 팝업만 띄우던 것과 동일한 체감을 위함). */
export function GlobalPrintModal() {
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
        router.push('/print');
      }}
      onApplyTemplate={(settings) => {
        applyTemplate(settings);
        setPrintModalOpen(false);
        router.push('/print');
      }}
    />
  );
}
