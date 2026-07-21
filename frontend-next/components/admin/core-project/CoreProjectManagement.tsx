'use client';

import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Briefcase, Check, ChevronDown, GripVertical, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { experienceApi, experiencePlacementApi } from '@/lib/api';
import type { Experience, ExperiencePlacementRequest } from '@/lib/api/types';

type DraftPlacement = ExperiencePlacementRequest;

type CoreProjectManagementProps = {
  onCreateProject: () => void;
};

export function CoreProjectManagement({ onCreateProject }: CoreProjectManagementProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DraftPlacement[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [expandedExperienceId, setExpandedExperienceId] = useState<number | null>(null);
  const [expandedDetailId, setExpandedDetailId] = useState<number | null>(null);

  const { data: experiences = [], isLoading: isExperiencesLoading } = useQuery({
    queryKey: ['experiences'],
    queryFn: experienceApi.list,
  });
  const { data: placements = [], isLoading: isPlacementsLoading } = useQuery({
    queryKey: ['experience-placements', 'CORE_PROJECT'],
    queryFn: experiencePlacementApi.listCoreProjects,
  });

  const toDraft = () =>
    placements.map((placement, index) => ({
      experienceId: placement.experienceId,
      displayOrder: index,
      enabled: placement.enabled,
      detailIds: placement.detailIds ?? [],
    }));

  useEffect(() => {
    setDraft(toDraft());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placements]);

  const selectableExperiences = useMemo(
    () => experiences.filter((experience) => experience.type === 'PROJECT').filter((experience) => !draft.some((item) => item.experienceId === experience.id)),
    [draft, experiences],
  );

  const experiencesById = useMemo(() => new Map(experiences.map((experience) => [experience.id, experience])), [experiences]);

  const careersById = useMemo(() => new Map(experiences.filter((experience) => experience.type === 'CAREER').map((career) => [career.id, career])), [experiences]);

  const projectContext = (experience: Experience) => {
    const career = experience.careerId ? careersById.get(experience.careerId) : undefined;
    return career ? `${career.companyName || career.title} · ${experience.role || career.role || '역할 미입력'}` : `독립·팀 프로젝트 · ${experience.role || '역할 미입력'}`;
  };

  const saveMutation = useMutation({
    mutationFn: () => experiencePlacementApi.replaceCoreProjects(draft.map((item, index) => ({ ...item, displayOrder: index }))),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['experience-placements', 'CORE_PROJECT'] }),
        queryClient.invalidateQueries({ queryKey: ['introduction'] }),
      ]);
      setIsEditing(false);
      setDraggedIndex(null);
    },
  });

  const cancelEditing = () => {
    setDraft(toDraft());
    setIsEditing(false);
    setDraggedIndex(null);
  };

  const reorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || toIndex >= draft.length) return;
    setDraft((current) => {
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((item, order) => ({ ...item, displayOrder: order }));
    });
  };

  const move = (index: number, direction: -1 | 1) => reorder(index, index + direction);

  const handleDragStart = (event: DragEvent<HTMLElement>, index: number) => {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (event: DragEvent<HTMLElement>, targetIndex: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    reorder(draggedIndex, targetIndex);
    setDraggedIndex(targetIndex);
  };

  const add = (experience: Experience) => {
    setDraft((current) => [
      ...current,
      {
        experienceId: experience.id,
        displayOrder: current.length,
        enabled: true,
        detailIds: experience.details.map((detail) => detail.id),
      },
    ]);
  };

  const setDetailSelected = (experienceId: number, detailId: number, selected: boolean) => {
    setDraft((current) =>
      current.map((item) => {
        if (item.experienceId !== experienceId) return item;
        const detailIds = selected ? [...item.detailIds, detailId] : item.detailIds.filter((id) => id !== detailId);
        return { ...item, detailIds };
      }),
    );
  };

  const selectAllDetails = (experience: Experience, selected: boolean) => {
    setDraft((current) => current.map((item) => (item.experienceId === experience.id ? { ...item, detailIds: selected ? experience.details.map((detail) => detail.id) : [] } : item)));
  };

  const remove = (experienceId: number) => {
    setDraft((current) => current.filter((item) => item.experienceId !== experienceId).map((item, index) => ({ ...item, displayOrder: index })));
  };

  const isLoading = isExperiencesLoading || isPlacementsLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
            <Briefcase className="h-5 w-5" /> 핵심 프로젝트 관리
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">독립 프로젝트와 직장 소속 프로젝트를 핵심 포트폴리오에 편성하고 노출 순서를 관리합니다.</p>
        </div>
        {isEditing ? (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onCreateProject} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-500 hover:text-slate-950">
              <Plus className="h-4 w-4" /> 새 프로젝트 등록
            </button>
            <button type="button" onClick={cancelEditing} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
              <X className="h-4 w-4" /> 취소
            </button>
            <button
              type="button"
              disabled={saveMutation.isPending || isLoading}
              onClick={() => saveMutation.mutate()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {saveMutation.isPending ? '저장 중...' : '편성 저장'}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setIsEditing(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-500 hover:text-slate-950">
            <Pencil className="h-4 w-4" /> 편성 편집
          </button>
        )}
      </div>

      {saveMutation.isSuccess && (
        <p className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <Check className="h-4 w-4" /> 핵심 프로젝트 편성을 저장했습니다.
        </p>
      )}
      {saveMutation.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{saveMutation.error instanceof Error ? saveMutation.error.message : '저장 중 오류가 발생했습니다.'}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-slate-900">현재 편성</h3>
            <p className="mt-0.5 text-xs text-slate-500">위에서부터 메인 포트폴리오에 표시됩니다.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{draft.length}개</span>
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-slate-400">불러오는 중...</p>
        ) : draft.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">편성된 핵심 프로젝트가 없습니다.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {draft.map((placement, index) => {
              const experience = experiencesById.get(placement.experienceId);
              if (!experience) return null;
              const isExpanded = expandedExperienceId === experience.id;
              const displayedDetails = isEditing ? experience.details : experience.details.filter((detail) => placement.detailIds.includes(detail.id));
              return (
                <article
                  key={placement.experienceId}
                  onClick={() => {
                    if (experience.details.length === 0) return;
                    setExpandedExperienceId((current) => (current === experience.id ? null : experience.id));
                    setExpandedDetailId(null);
                  }}
                  onDragOver={isEditing ? (event) => handleDragOver(event, index) : undefined}
                  onDrop={(event) => {
                    if (!isEditing) return;
                    event.preventDefault();
                    setDraggedIndex(null);
                  }}
                  className={`px-1 py-3 transition first:pt-0 last:pb-0 ${experience.details.length > 0 ? 'cursor-pointer' : ''} ${draggedIndex === index ? 'bg-blue-50/70 ring-1 ring-blue-200' : 'bg-white'}`}
                >
                  <div className="flex items-center gap-2">
                    {isEditing && (
                      <span
                        draggable
                        role="button"
                        tabIndex={0}
                        aria-label={`${experience.title} 순서 이동`}
                        title="드래그하여 순서 변경"
                        onClick={(event) => event.stopPropagation()}
                        onDragStart={(event) => handleDragStart(event, index)}
                        onDragEnd={() => setDraggedIndex(null)}
                        className="grid h-9 w-7 shrink-0 cursor-grab place-items-center rounded-lg text-slate-300 transition hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
                      >
                        <GripVertical className="h-5 w-5" />
                      </span>
                    )}
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-black text-white">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-800">{experience.title}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-400">{projectContext(experience)}</p>
                    </div>
                    {experience.details.length > 0 && (
                      <span className="inline-flex shrink-0 items-center gap-1 px-2 py-2 text-xs font-bold text-slate-500">
                        상세 경험 {placement.detailIds.length}/{experience.details.length}
                        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                      </span>
                    )}
                    {isEditing && (
                      <>
                        <label onClick={(event) => event.stopPropagation()} className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-slate-500">
                          <input
                            type="checkbox"
                            checked={placement.enabled}
                            onChange={(event) => setDraft((current) => current.map((item) => (item.experienceId === placement.experienceId ? { ...item, enabled: event.target.checked } : item)))}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          노출
                        </label>
                        <div onClick={(event) => event.stopPropagation()} className="flex items-center gap-1">
                          <button type="button" onClick={() => move(index, -1)} disabled={index === 0} title="위로 이동" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-25">
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => move(index, 1)} disabled={index === draft.length - 1} title="아래로 이동" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-25">
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => remove(placement.experienceId)} title="편성에서 제거" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {experience.details.length > 0 && (
                    <div className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${isExpanded ? 'mt-3 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'}`}>
                      <div className="min-h-0 overflow-hidden">
                        <div className={`${isEditing ? 'ml-9' : 'ml-0'} border-t border-slate-200 pl-9 pt-3`}>
                          {isEditing && (
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <p className="text-[11px] font-semibold text-slate-400">체크를 해제하면 핵심 프로젝트에서만 숨겨집니다.</p>
                              <div onClick={(event) => event.stopPropagation()} className="flex items-center gap-1">
                                <button type="button" onClick={() => selectAllDetails(experience, true)} className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-950">
                                  전체 선택
                                </button>
                                <button type="button" onClick={() => selectAllDetails(experience, false)} className="px-2 py-1 text-[11px] font-bold text-slate-400 hover:text-slate-700">
                                  전체 해제
                                </button>
                              </div>
                            </div>
                          )}

                          {displayedDetails.length === 0 ? (
                            <p className="py-3 text-xs font-semibold text-slate-400">선택된 상세 경험이 없습니다.</p>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {displayedDetails.map((detail) => {
                                const isDetailExpanded = expandedDetailId === detail.id;
                                const hasDetailContent = Boolean(detail.narrative || detail.situation || detail.actionDetail || detail.outcome || detail.skills.length > 0);
                                return (
                                  <div key={detail.id}>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        if (hasDetailContent) setExpandedDetailId((current) => (current === detail.id ? null : detail.id));
                                      }}
                                      className={`flex w-full items-start gap-2.5 py-2.5 text-left ${hasDetailContent ? 'group' : 'cursor-default'}`}
                                    >
                                      {isEditing && (
                                        <input
                                          type="checkbox"
                                          checked={placement.detailIds.includes(detail.id)}
                                          onClick={(event) => event.stopPropagation()}
                                          onChange={(event) => setDetailSelected(experience.id, detail.id, event.target.checked)}
                                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
                                        />
                                      )}
                                      <span className="min-w-0 flex-1 text-sm font-semibold leading-5 text-slate-700 group-hover:text-slate-950">{detail.content}</span>
                                      {hasDetailContent && <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${isDetailExpanded ? 'rotate-180 text-slate-700' : ''}`} />}
                                    </button>

                                    {hasDetailContent && (
                                      <div className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${isDetailExpanded ? 'mb-3 grid-rows-[1fr] opacity-100' : 'mb-0 grid-rows-[0fr] opacity-0'}`}>
                                        <div className="min-h-0 overflow-hidden">
                                          <div className={`${isEditing ? 'ml-6' : 'ml-0'} space-y-3 border-l-2 border-slate-200 py-1 pl-4 text-xs leading-relaxed text-slate-600`}>
                                            {(() => {
                                              const merged = detail.narrative || [detail.situation, detail.actionDetail, detail.outcome].filter(Boolean).join('\n\n');
                                              return merged ? <p className="whitespace-pre-line">{merged}</p> : null;
                                            })()}
                                            {detail.skills.length > 0 && (
                                              <div className="flex flex-wrap gap-1 pt-0.5">
                                                {detail.skills.map((skill) => (
                                                  <span key={skill.id} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                                                    {skill.name}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {isEditing && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="font-black text-slate-900">추가 가능한 프로젝트</h3>
            <p className="mt-0.5 text-xs text-slate-500">등록된 프로젝트만 핵심 프로젝트로 편성할 수 있습니다.</p>
          </div>
          {selectableExperiences.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-4">
              <div>
                <p className="text-sm font-bold text-slate-600">등록된 모든 프로젝트가 이미 편성되어 있습니다.</p>
                <p className="mt-0.5 text-xs text-slate-400">새 항목이 필요하면 프로젝트를 먼저 등록해 주세요.</p>
              </div>
              <button type="button" onClick={onCreateProject} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800">
                <Plus className="h-3.5 w-3.5" /> 새 프로젝트 등록
              </button>
            </div>
          ) : (
            <div className="grid gap-2 lg:grid-cols-2">
              {selectableExperiences.map((experience) => (
                <button key={experience.id} type="button" onClick={() => add(experience)} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-slate-400 hover:bg-slate-50">
                  <Plus className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-700">{experience.title}</span>
                    <span className="block text-xs text-slate-400">{projectContext(experience)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
