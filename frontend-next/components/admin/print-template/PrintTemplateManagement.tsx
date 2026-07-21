'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Printer, Plus, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Edit2 } from 'lucide-react';
import { printTemplateApi } from '@/lib/api';
import type { PrintTemplate } from '@/lib/api/types';

/**
 * 실제 인쇄 레이아웃 조정(섹션 제외/순서/여백)은 /print 페이지의 "템플릿으로 저장" 기능으로
 * 이루어진다. 원본(Vite) 앱은 이 화면 안에 /?mode=print&adminEdit=1 iframe을 띄워 postMessage로
 * 저장 상태를 동기화했는데, 그 admin-iframe 연동은 별도 작업으로 미뤄두기로 했다 — 지금은
 * 목록/공개여부/순서/삭제 관리만 담당하고, 새 템플릿 작성/수정은 /print를 새 탭으로 열어 안내한다.
 */
export function PrintTemplateManagement() {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['printTemplates', 'admin'],
    queryFn: printTemplateApi.adminList,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof printTemplateApi.update>[1] }) => printTemplateApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['printTemplates'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => printTemplateApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['printTemplates'] }),
  });

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="flex items-center gap-2.5 text-xl font-black text-slate-900">
            <Printer className="h-5 w-5 text-slate-700" />
            PDF 인쇄 템플릿 관리
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">방문자가 선택할 수 있는 PDF 인쇄 템플릿 목록입니다. 레이아웃 조정은 인쇄 미리보기에서 &quot;템플릿으로 저장&quot;으로 만듭니다.</p>
        </div>
        <a href="/print" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
          <Plus className="h-4 w-4" /> 인쇄 미리보기에서 새 템플릿 만들기
        </a>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm font-bold text-slate-400">템플릿 목록 로딩 중...</div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-base font-bold text-slate-700">등록된 인쇄 템플릿이 없습니다.</p>
            <p className="text-xs text-slate-500">위의 버튼으로 인쇄 미리보기를 열어 레이아웃을 구성한 뒤 &quot;템플릿으로 저장&quot;을 눌러보세요.</p>
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
                        <button disabled={index === 0} onClick={() => handleMoveDisplayOrder(index, 'up')} className="grid h-5 w-5 place-items-center rounded hover:bg-slate-200 text-slate-500 disabled:opacity-20" title="위로">
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
                  <td className="py-4 px-6 font-medium text-slate-600">{t.excludedIds.length > 0 ? `${t.excludedIds.length}개 항목 제외됨` : '모든 섹션 포함'}</td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => handleToggleVisible(t)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition ${
                        t.visible ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {t.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {t.visible ? '공개' : '비공개'}
                    </button>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="inline-flex items-center gap-2">
                      <a
                        href="/print"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:border-slate-400 hover:bg-slate-50 transition shadow-xs"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                        편집
                      </a>
                      <button onClick={() => handleDelete(t)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition" title="템플릿 삭제">
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
