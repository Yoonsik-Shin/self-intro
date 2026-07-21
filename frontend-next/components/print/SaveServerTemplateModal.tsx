'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Printer, Check, X } from 'lucide-react';
import { printTemplateApi } from '@/lib/api';
import type { PrintTemplate, PrintTemplateRequest } from '@/lib/api/types';

type SaveServerTemplateModalProps = {
  open: boolean;
  onClose: () => void;
  currentSettings: {
    excludedIds: string[];
    sectionOrder: string[];
    sectionGaps: Record<string, number>;
  };
  editingTemplate?: PrintTemplate | null;
  onSaved?: () => void;
};

/** 인쇄 프리뷰 화면에서 현재 조정한 설정을 서버 DB 템플릿으로 저장하는 모달 */
export function SaveServerTemplateModal({ open, onClose, currentSettings, editingTemplate, onSaved }: SaveServerTemplateModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(editingTemplate?.name || '');
  const [visible, setVisible] = useState(editingTemplate?.visible ?? true);

  const createMutation = useMutation({
    mutationFn: (payload: PrintTemplateRequest) => printTemplateApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
      alert('템플릿이 저장되었습니다.');
      onSaved?.();
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PrintTemplateRequest }) => printTemplateApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
      alert('템플릿이 수정되었습니다.');
      onSaved?.();
      onClose();
    },
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('템플릿 이름을 입력해 주세요.');
      return;
    }

    const payload: PrintTemplateRequest = {
      name: name.trim(),
      excludedIds: JSON.stringify(currentSettings.excludedIds),
      sectionOrder: JSON.stringify(currentSettings.sectionOrder),
      sectionGaps: JSON.stringify(currentSettings.sectionGaps),
      visible,
      displayOrder: editingTemplate?.displayOrder ?? 1,
    };

    if (editingTemplate?.id) {
      updateMutation.mutate({ id: editingTemplate.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-white">
              <Printer className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-black text-slate-900">{editingTemplate ? '템플릿 수정 저장' : '새 템플릿으로 저장'}</h2>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">템플릿 이름 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: Backend 이력서용, 핵심 요약본 등"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-slate-900"
              autoFocus
              required
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer rounded-xl border border-slate-200 p-3.5 bg-slate-50/50 hover:bg-slate-50">
            <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
            <div>
              <span className="block text-sm font-bold text-slate-900">공개로 설정</span>
              <span className="block text-xs font-medium text-slate-500">방문자 인쇄 모달 템플릿 목록에 노출됩니다</span>
            </div>
          </label>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-700">저장될 현재 프리뷰 상태:</div>
            <div>• 제외 항목: {currentSettings.excludedIds.length}개 선택됨</div>
            <div>• 섹션 간격 조정: {Object.keys(currentSettings.sectionGaps).length}개 설정됨</div>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
              취소
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
