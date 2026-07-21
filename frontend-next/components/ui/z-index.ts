// 기존 모달들이 각자 하드코딩하던 z-50/z-[60]/z-[75]/z-[100]을 의미 기반 토큰으로 승격.
export const zIndex = {
  base: 50, // 일반 오버레이 (DonationModal, PrintPreviewBar)
  raised: 60, // 오버레이 위 오버레이 (PrintModeModal, 인쇄 사이드패널)
  top: 75, // 그 위의 모달 (SaveServerTemplateModal)
  system: 100, // 풀스크린 시스템 에디터 (AdminPrintTemplateEditorModal)
} as const;

export type ModalLayer = keyof typeof zIndex;
