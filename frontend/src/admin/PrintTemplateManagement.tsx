import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Printer,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Edit2,
  Check,
  X,
  ListChecks,
} from 'lucide-react';
import { printTemplateApi, type PrintTemplate, type PrintTemplateRequest } from '../lib/api';

export function PrintTemplateManagement() {
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PrintTemplate | null>(null);
  const [formName, setFormName] = useState('');
  const [formVisible, setFormVisible] = useState(true);

  // iframe 편집기 내 상단 X(닫기) 버튼 클릭 메시지 수신 연동
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CLOSE_ADMIN_EDIT') {
        setIsEditing(false);
        setEditingTemplate(null);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['printTemplates', 'admin'],
    queryFn: printTemplateApi.adminList,
  });

  const createMutation = useMutation({
    mutationFn: (payload: PrintTemplateRequest) => printTemplateApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
      alert('템플릿이 저장되었습니다.');
      setIsEditing(false);
      setEditingTemplate(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PrintTemplateRequest }) =>
      printTemplateApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
      alert('템플릿이 수정되었습니다.');
      setIsEditing(false);
      setEditingTemplate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => printTemplateApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
    },
  });

  const handleStartCreate = () => {
    setEditingTemplate(null);
    setFormName('');
    setFormVisible(true);
    setIsEditing(true);
  };

  const handleStartEdit = (t: PrintTemplate) => {
    setEditingTemplate(t);
    setFormName(t.name);
    setFormVisible(t.visible);
    setIsEditing(true);
  };

  const handleDelete = (t: PrintTemplate) => {
    if (confirm(`'${t.name}' 템플릿을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(t.id);
    }
  };

  const handleToggleVisible = (t: PrintTemplate) => {
    updateMutation.mutate({
      id: t.id,
      payload: {
        name: t.name,
        excludedIds: JSON.stringify(t.excludedIds),
        sectionOrder: JSON.stringify(t.sectionOrder),
        sectionGaps: JSON.stringify(t.sectionGaps),
        visible: !t.visible,
        displayOrder: t.displayOrder,
      },
    });
  };

  const handleMoveDisplayOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= templates.length) return;

    const current = templates[index];
    const target = templates[targetIndex];

    updateMutation.mutate({
      id: current.id,
      payload: {
        name: current.name,
        excludedIds: JSON.stringify(current.excludedIds),
        sectionOrder: JSON.stringify(current.sectionOrder),
        sectionGaps: JSON.stringify(current.sectionGaps),
        visible: current.visible,
        displayOrder: target.displayOrder,
      },
    });

    updateMutation.mutate({
      id: target.id,
      payload: {
        name: target.name,
        excludedIds: JSON.stringify(target.excludedIds),
        sectionOrder: JSON.stringify(target.sectionOrder),
        sectionGaps: JSON.stringify(target.sectionGaps),
        visible: target.visible,
        displayOrder: current.displayOrder,
      },
    });
  };

  const handleSaveEditorTemplate = () => {
    if (!formName.trim()) {
      alert('템플릿 이름을 입력해 주세요.');
      return;
    }

    // iframe의 최신 프리뷰 상태(excludedIds, sectionOrder, sectionGaps)를 가져오거나 기본값을 전송한다
    const payload: PrintTemplateRequest = {
      name: formName.trim(),
      excludedIds: JSON.stringify(editingTemplate?.excludedIds || []),
      sectionOrder: JSON.stringify(editingTemplate?.sectionOrder || ['skills', 'competencies', 'career', 'projects', 'credentials']),
      sectionGaps: JSON.stringify(editingTemplate?.sectionGaps || {}),
      visible: formVisible,
      displayOrder: editingTemplate?.displayOrder ?? (templates.length + 1),
    };

    if (editingTemplate?.id) {
      updateMutation.mutate({ id: editingTemplate.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // ── 1. 편집 모드 (어드민 메인 영역 안에서 단일 통합 툴바 기반 실시간 인쇄 편집기) ──
  if (isEditing) {
    return (
      <div className="relative h-[calc(100vh-140px)] min-h-[600px] w-full rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden shadow-inner">
        <iframe
          src="/?mode=print&adminEdit=1"
          title="PDF 템플릿 인쇄 편집기"
          className="h-full w-full border-0"
        />
      </div>
    );
  }

  // ── 2. 목록 모드 (어드민 메인 영역에 템플릿 테이블만 표출) ──
  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="flex items-center gap-2.5 text-xl font-black text-slate-900">
            <Printer className="h-5 w-5 text-slate-700" />
            PDF 인쇄 템플릿 관리
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            방문자가 선택할 수 있는 PDF 인쇄 템플릿 목록입니다. 템플릿을 추가하거나 수정하여 인쇄 레이아웃을 구성하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={handleStartCreate}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" /> 새 템플릿 추가
        </button>
      </div>

      {/* Templates Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm font-bold text-slate-400">템플릿 목록 로딩 중...</div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-base font-bold text-slate-700">등록된 인쇄 템플릿이 없습니다.</p>
            <p className="text-xs text-slate-500">
              우측 상단의 "새 템플릿 추가"를 눌러 시각적 인쇄 편집기에서 원하시는 이력서 레이아웃을 구성해보세요.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-6">순서</th>
                <th className="py-3.5 px-6">템플릿 이름</th>
                <th className="py-3.5 px-6">제외 설정 항목</th>
                <th className="py-3.5 px-6">공개 여부</th>
                <th className="py-3.5 px-6 text-right font-bold">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {templates.map((t, index) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-4 px-6 font-bold text-slate-400">
                    <div className="flex items-center gap-1">
                      <span>{t.displayOrder}</span>
                      <div className="flex flex-col gap-0.5 ml-2">
                        <button
                          disabled={index === 0}
                          onClick={() => handleMoveDisplayOrder(index, 'up')}
                          className="grid h-5 w-5 place-items-center rounded hover:bg-slate-200 text-slate-500 disabled:opacity-20"
                          title="위로"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          disabled={index === templates.length - 1}
                          onClick={() => handleMoveDisplayOrder(index, 'down')}
                          className="grid h-5 w-5 place-items-center rounded hover:bg-slate-200 text-slate-500 disabled:opacity-20"
                          title="아래로"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-900">{t.name}</td>
                  <td className="py-4 px-6 font-medium text-slate-600">
                    {t.excludedIds.length > 0 ? `${t.excludedIds.length}개 항목 제외됨` : '모든 섹션 포함'}
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => handleToggleVisible(t)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition ${
                        t.visible
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {t.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {t.visible ? '공개' : '비공개'}
                    </button>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => handleStartEdit(t)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:border-slate-400 hover:bg-slate-50 transition shadow-xs"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                        편집
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition"
                        title="템플릿 삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
