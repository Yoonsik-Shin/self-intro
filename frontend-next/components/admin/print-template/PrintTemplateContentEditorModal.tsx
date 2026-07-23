'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Copy, FileText, RefreshCw, X } from 'lucide-react';
import { printTemplateApi } from '@/lib/api';
import type {
    Experience,
    ExperienceDetail,
    IntroductionResponse,
    PrintTemplate,
    PrintTemplateContentOverrides,
} from '@/lib/api/types';
import {
    countContentOverrides,
    getPrintContentFingerprint,
    getTemplateDiffSummary,
} from '@/lib/printTemplateContent';

type Props = {
    template: PrintTemplate;
    introData: IntroductionResponse;
    onClose: () => void;
};

type ProfileField = 'jobTitle' | 'bio' | 'coreStackSummary';
type ExperienceField = 'title' | 'summary' | 'takeaway' | 'role';
type DetailField = 'content' | 'situation' | 'task' | 'actionDetail' | 'outcome' | 'narrative';

const profileLabels: Array<[ProfileField, string]> = [
    ['jobTitle', '직무명'],
    ['bio', '프로필 소개'],
    ['coreStackSummary', '핵심 기술 요약'],
];

const experienceLabels: Array<[ExperienceField, string]> = [
    ['title', '제목'],
    ['summary', '요약'],
    ['role', '역할'],
    ['takeaway', '핵심 성과'],
];

const detailLabels: Array<[DetailField, string]> = [
    ['content', '상세 제목'],
    ['narrative', '상세 설명'],
];

function cloneOverrides(value: PrintTemplateContentOverrides): PrintTemplateContentOverrides {
    return JSON.parse(JSON.stringify(value)) as PrintTemplateContentOverrides;
}

export function PrintTemplateContentEditorModal({ template, introData, onClose }: Props) {
    const queryClient = useQueryClient();
    const [targetRole, setTargetRole] = useState(template.targetRole || 'GENERAL');
    const [overrides, setOverrides] = useState<PrintTemplateContentOverrides>(() =>
        cloneOverrides(template.contentOverrides || {})
    );
    const [filter, setFilter] = useState('');

    const diffs = useMemo(
        () => getTemplateDiffSummary(overrides, introData),
        [overrides, introData]
    );

    const experiences = useMemo(
        () =>
            introData.experiences.filter(
                (experience) =>
                    (experience.type === 'CAREER' || experience.type === 'PROJECT') &&
                    (!filter.trim() ||
                        experience.title.toLowerCase().includes(filter.trim().toLowerCase()))
            ),
        [introData.experiences, filter]
    );

    const saveMutation = useMutation({
        mutationFn: () =>
            printTemplateApi.update(template.id, {
                name: template.name,
                excludedIds: JSON.stringify(template.excludedIds),
                sectionOrder: JSON.stringify(template.sectionOrder),
                sectionGaps: JSON.stringify(template.sectionGaps),
                targetRole: targetRole.trim() || 'GENERAL',
                contentOverrides: JSON.stringify(overrides),
                baseContentFingerprint: getPrintContentFingerprint(introData),
                schemaVersion: 2,
                visible: template.visible,
                displayOrder: template.displayOrder,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
            alert('템플릿 전용 문구가 저장되었습니다.');
            onClose();
        },
        onError: (error) => alert(`저장하지 못했습니다: ${error.message}`),
    });

    const setProfileField = (field: ProfileField, value: string | undefined) => {
        setOverrides((current) => {
            const next = cloneOverrides(current);
            const profile = { ...(next.profile ?? {}) };
            if (value === undefined) delete profile[field];
            else profile[field] = value;
            next.profile = Object.keys(profile).length > 0 ? profile : undefined;
            return next;
        });
    };

    const setExperienceField = (
        experience: Experience,
        field: ExperienceField,
        value: string | undefined
    ) => {
        setOverrides((current) => {
            const next = cloneOverrides(current);
            const experiencesMap = { ...(next.experiences ?? {}) };
            const fields = { ...(experiencesMap[String(experience.id)] ?? {}) };
            if (value === undefined) delete fields[field];
            else fields[field] = value;
            if (Object.keys(fields).length > 0) experiencesMap[String(experience.id)] = fields;
            else delete experiencesMap[String(experience.id)];
            next.experiences = Object.keys(experiencesMap).length > 0 ? experiencesMap : undefined;
            return next;
        });
    };

    const setDetailField = (
        detail: ExperienceDetail,
        field: DetailField,
        value: string | undefined
    ) => {
        setOverrides((current) => {
            const next = cloneOverrides(current);
            const detailMap = { ...(next.details ?? {}) };
            const fields = { ...(detailMap[String(detail.id)] ?? {}) };
            if (value === undefined) delete fields[field];
            else fields[field] = value;
            if (Object.keys(fields).length > 0) detailMap[String(detail.id)] = fields;
            else delete detailMap[String(detail.id)];
            next.details = Object.keys(detailMap).length > 0 ? detailMap : undefined;
            return next;
        });
    };

    const handleClearAllOverrides = () => {
        if (confirm('모든 맞춤 문구를 해제하고 최신 DB 원본 내용으로 복원하시겠습니까?')) {
            setOverrides({});
        }
    };

    const renderOverrideField = ({
        label,
        enabled,
        value,
        baseValue,
        multiline = true,
        onToggle,
        onChange,
    }: {
        label: string;
        enabled: boolean;
        value: string;
        baseValue: string;
        multiline?: boolean;
        onToggle: (enabled: boolean) => void;
        onChange: (value: string) => void;
    }) => {
        const isDifferentFromBase = enabled && value !== baseValue;

        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800">{label}</span>
                        {isDifferentFromBase && (
                            <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 border border-amber-200">
                                원본과 상이함
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {enabled && (
                            <button
                                type="button"
                                onClick={() => onChange(baseValue)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                                title="최신 DB 원본 문구를 커스텀 입력창에 복사합니다"
                            >
                                <Copy className="h-3 w-3" />
                                DB 원본 복사
                            </button>
                        )}
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(event) => onToggle(event.target.checked)}
                                className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            템플릿 전용 문구 사용
                        </label>
                    </div>
                </div>

                {/* Side-by-Side 2-Column Layout */}
                <div className="grid gap-3 sm:grid-cols-2">
                    {/* Left: DB Live Content (Read-Only) */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>🏛️ 최신 DB 원본 문구</span>
                            <span className="text-[10px] text-slate-400">읽기 전용</span>
                        </div>
                        {multiline ? (
                            <div className="min-h-[60px] max-h-[140px] overflow-y-auto whitespace-pre-wrap text-xs text-slate-700 leading-relaxed font-medium bg-white rounded-lg p-2.5 border border-slate-200/60">
                                {baseValue || (
                                    <span className="text-slate-400 italic">(비어 있음)</span>
                                )}
                            </div>
                        ) : (
                            <div className="text-xs text-slate-700 font-medium bg-white rounded-lg p-2 border border-slate-200/60 truncate">
                                {baseValue || (
                                    <span className="text-slate-400 italic">(비어 있음)</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: Template Custom Override (Editable) */}
                    <div
                        className={`rounded-xl border p-3 space-y-1.5 transition ${
                            enabled
                                ? 'border-blue-300 bg-blue-50/30'
                                : 'border-slate-200 bg-slate-100/50 opacity-60'
                        }`}
                    >
                        <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className={enabled ? 'text-blue-700' : 'text-slate-500'}>
                                ✍️ 템플릿 전용 맞춤 문구
                            </span>
                            <span className="text-[10px]">
                                {enabled ? (
                                    <span className="text-blue-600 font-bold">수정 중</span>
                                ) : (
                                    <span className="text-slate-400">DB 원본 사용 중</span>
                                )}
                            </span>
                        </div>
                        {multiline ? (
                            <textarea
                                rows={label.includes('설명') || label.includes('소개') ? 4 : 2}
                                disabled={!enabled}
                                value={enabled ? value : baseValue}
                                onChange={(event) => onChange(event.target.value)}
                                placeholder="템플릿에 전용으로 표시할 맞춤 문구를 입력하세요"
                                className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:border-blue-500 focus:outline-none"
                            />
                        ) : (
                            <input
                                disabled={!enabled}
                                value={enabled ? value : baseValue}
                                onChange={(event) => onChange(event.target.value)}
                                placeholder="템플릿 전용 맞춤 문구"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:border-blue-500 focus:outline-none"
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const selectedSkillIds = overrides.selectedSkillIds;
    const customSkills = Array.isArray(selectedSkillIds);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
            <div className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl">
                <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                                <FileText className="h-5 w-5 text-blue-600" />
                                {template.name} 맞춤 문구 편집
                            </h2>
                            {diffs.length > 0 && (
                                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800">
                                    DB 원본과 차이 {diffs.length}개
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                            체크하지 않은 필드는 최신 DB 원본 문구를 자동 사용합니다. 현재 맞춤 설정{' '}
                            {countContentOverrides(overrides)}개
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {countContentOverrides(overrides) > 0 && (
                            <button
                                onClick={handleClearAllOverrides}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                            >
                                <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                                모든 맞춤 해제 (DB 원본 사용)
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 transition"
                            aria-label="닫기"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                <div className="flex-1 space-y-6 overflow-y-auto p-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        <label className="block text-xs font-black text-slate-800">
                            지원 직무 타깃
                        </label>
                        <input
                            value={targetRole}
                            onChange={(event) => setTargetRole(event.target.value)}
                            placeholder="예: BACKEND, DEVOPS, AI_DATA"
                            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold focus:border-blue-500 focus:outline-none"
                        />
                    </section>

                    {introData.profile && (
                        <section className="space-y-3">
                            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-blue-600" />
                                프로필 커스터마이징
                            </h3>
                            {profileLabels.map(([field, label]) => {
                                const value = overrides.profile?.[field];
                                const baseValue = introData.profile?.[field] ?? '';
                                return (
                                    <div key={field}>
                                        {renderOverrideField({
                                            label,
                                            enabled: value !== undefined,
                                            value: value ?? baseValue,
                                            baseValue,
                                            multiline: field !== 'jobTitle',
                                            onToggle: (enabled) =>
                                                setProfileField(
                                                    field,
                                                    enabled ? baseValue : undefined
                                                ),
                                            onChange: (nextValue) =>
                                                setProfileField(field, nextValue),
                                        })}
                                    </div>
                                );
                            })}
                        </section>
                    )}

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        <label className="flex items-center justify-between gap-3">
                            <span>
                                <span className="block text-sm font-black text-slate-900">
                                    기술 스택 필터링
                                </span>
                                <span className="text-xs font-semibold text-slate-500">
                                    체크를 해제하면 DB 원본의 최신 핵심 기술을 모두 사용합니다.
                                </span>
                            </span>
                            <input
                                type="checkbox"
                                checked={customSkills}
                                onChange={(event) =>
                                    setOverrides((current) => ({
                                        ...current,
                                        selectedSkillIds: event.target.checked
                                            ? introData.skills.map((skill) => skill.id)
                                            : undefined,
                                    }))
                                }
                                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                            />
                        </label>
                        {customSkills && (
                            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {introData.skills.map((skill) => (
                                    <label
                                        key={skill.id}
                                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedSkillIds.includes(skill.id)}
                                            onChange={() =>
                                                setOverrides((current) => {
                                                    const ids = current.selectedSkillIds ?? [];
                                                    return {
                                                        ...current,
                                                        selectedSkillIds: ids.includes(skill.id)
                                                            ? ids.filter((id) => id !== skill.id)
                                                            : [...ids, skill.id],
                                                    };
                                                })
                                            }
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        {skill.name}
                                    </label>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-blue-600" />
                                경력 · 프로젝트 문구 커스터마이징
                            </h3>
                            <input
                                value={filter}
                                onChange={(event) => setFilter(event.target.value)}
                                placeholder="경력 제목 검색..."
                                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        {experiences.map((experience) => (
                            <details
                                key={experience.id}
                                className="group rounded-2xl border border-slate-200 bg-white shadow-xs"
                            >
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50/60 rounded-2xl transition">
                                    <span>
                                        <span className="block text-sm font-black text-slate-900">
                                            {experience.title}
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-400">
                                            {experience.type} · 상세 성과{' '}
                                            {experience.details.length}개
                                        </span>
                                    </span>
                                    <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                                </summary>
                                <div className="space-y-4 border-t border-slate-100 p-5">
                                    {experienceLabels.map(([field, label]) => {
                                        const value =
                                            overrides.experiences?.[String(experience.id)]?.[field];
                                        const baseValue = String(experience[field] ?? '');
                                        return (
                                            <div key={field}>
                                                {renderOverrideField({
                                                    label,
                                                    enabled: value !== undefined,
                                                    value: value ?? baseValue,
                                                    baseValue,
                                                    multiline:
                                                        field !== 'title' && field !== 'role',
                                                    onToggle: (enabled) =>
                                                        setExperienceField(
                                                            experience,
                                                            field,
                                                            enabled ? baseValue : undefined
                                                        ),
                                                    onChange: (nextValue) =>
                                                        setExperienceField(
                                                            experience,
                                                            field,
                                                            nextValue
                                                        ),
                                                })}
                                            </div>
                                        );
                                    })}

                                    {experience.details.map((detail) => (
                                        <div
                                            key={detail.id}
                                            className="space-y-3 rounded-2xl border-l-4 border-blue-500 bg-slate-50/60 p-4"
                                        >
                                            <p className="text-xs font-black text-slate-800">
                                                📌 상세 성과: {detail.content}
                                            </p>
                                            {detailLabels.map(([field, label]) => {
                                                const value =
                                                    overrides.details?.[String(detail.id)]?.[field];
                                                const baseValue = String(detail[field] ?? '');
                                                return (
                                                    <div key={field}>
                                                        {renderOverrideField({
                                                            label,
                                                            enabled: value !== undefined,
                                                            value: value ?? baseValue,
                                                            baseValue,
                                                            onToggle: (enabled) =>
                                                                setDetailField(
                                                                    detail,
                                                                    field,
                                                                    enabled ? baseValue : undefined
                                                                ),
                                                            onChange: (nextValue) =>
                                                                setDetailField(
                                                                    detail,
                                                                    field,
                                                                    nextValue
                                                                ),
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </details>
                        ))}
                    </section>
                </div>

                <footer className="flex items-center justify-end gap-2.5 border-t border-slate-200 bg-white px-6 py-4">
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
                    >
                        취소
                    </button>
                    <button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-6 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs"
                    >
                        <Check className="h-4 w-4" />
                        맞춤 문구 저장
                    </button>
                </footer>
            </div>
        </div>
    );
}
