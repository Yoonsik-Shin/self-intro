import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Printer, Check, X, ListChecks, Save, Eye, EyeOff } from 'lucide-react';
import { printTemplateApi, type PrintTemplate, type PrintTemplateRequest } from '../lib/api';

type AdminPrintTemplateEditorModalProps = {
  open: boolean;
  template: PrintTemplate | null; // null이면 신규 생성
  onClose: () => void;
};

/** 관리자 전용 독립 템플릿 에디터 모달 (어드민 미리보기 패널에 병합되지 않고 별도의 독립 기능으로 동작) */
export function AdminPrintTemplateEditorModal({ open, template, onClose }: AdminPrintTemplateEditorModalProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [visible, setVisible] = useState(true);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  const [sectionGaps, setSectionGaps] = useState<Record<string, number>>({});
  const [navPanelOpen, setNavPanelOpen] = useState(false);

  // 템플릿이 넘어오거나 모달이 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setName(template?.name || '');
      setVisible(template?.visible ?? true);
      setExcludedIds(template?.excludedIds || []);
      setSectionOrder(template?.sectionOrder || ['skills', 'competencies', 'career', 'projects', 'credentials']);
      setSectionGaps(template?.sectionGaps || {});
    }
  }, [open, template]);

  const createMutation = useMutation({
    mutationFn: (payload: PrintTemplateRequest) => printTemplateApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
      alert('템플릿이 생성되었습니다.');
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PrintTemplateRequest }) =>
      printTemplateApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
      alert('템플릿이 수정되었습니다.');
      onClose();
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      alert('템플릿 이름을 입력해 주세요.');
      return;
    }

    const payload: PrintTemplateRequest = {
      name: name.trim(),
      excludedIds: JSON.stringify(excludedIds),
      sectionOrder: JSON.stringify(sectionOrder),
      sectionGaps: JSON.stringify(sectionGaps),
      visible,
      displayOrder: template?.displayOrder ?? 1,
    };

    if (template?.id) {
      updateMutation.mutate({ id: template.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
      {/* ── 관리자 전용 상단 툴바 ───────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/90 px-6 py-3 shadow-md backdrop-blur-md">
        {/* Left: Title & Info */}
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white font-bold">
            <Printer className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white">
              {template ? 'PDF 템플릿 수정' : '새 PDF 템플릿 생성'}
            </h1>
            <p className="text-[11px] font-medium text-slate-400">
              이력서 레이아웃을 시각적으로 조정한 뒤 저장하세요.
            </p>
          </div>
        </div>

        {/* Center: Template Name Input & Visibility Checkbox */}
        <div className="flex flex-1 items-center justify-center gap-3 max-w-xl min-w-[280px]">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="템플릿 이름을 입력하세요 (예: Backend 지원용)"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          <label className="flex shrink-0 items-center gap-2 cursor-pointer rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800">
            <input
              type="checkbox"
              checked={visible}
              onChange={(e) => setVisible(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
            />
            <span>공개</span>
          </label>
        </div>

        {/* Right: Actions (No LocalSave / No Print button for Admin) */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setNavPanelOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
              navPanelOpen
                ? 'border-blue-500 bg-blue-600 text-white'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-white'
            }`}
          >
            <ListChecks className="h-4 w-4" />
            <span>구성 관리</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-md transition hover:bg-blue-500 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>템플릿 저장</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition"
            title="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ── Main Workspace: Iframe Preview with Print Mode ────────── */}
      <div className="relative flex-1 bg-slate-900">
        <iframe
          src="/?preview=1&printMode=1"
          title="템플릿 인쇄 편집기"
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}
