'use client';

import { Pencil, Star, Trash2 } from 'lucide-react';
import type { Skill } from '@/lib/api/types';
import { SkillBadgeIcon } from '@/lib/SkillBadgeIcon';
import { getSkillLevelDotClass, skillUsagePresentations } from './skillPresentation';

type SkillManagementCardProps = {
    skill: Skill;
    onEdit: (skill: Skill) => void;
    onDelete: (id: number) => void;
    onToggleCore: (skill: Skill) => void;
    isCoreUpdating?: boolean;
};

export function SkillManagementCard({
    skill,
    onEdit,
    onDelete,
    onToggleCore,
    isCoreUpdating = false,
}: SkillManagementCardProps) {
    const usage = skillUsagePresentations[skill.usageType] ?? {
        label: skill.usageType,
        Icon: Star,
        className: 'border-slate-200 bg-slate-50 text-slate-600',
    };
    const UsageIcon = usage.Icon;

    return (
        <article className="flex flex-col rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    <SkillBadgeIcon
                        name={skill.name}
                        badgeKey={skill.badgeKey}
                        badgeColor={skill.badgeColor}
                        className="h-6 w-6"
                    />
                    <h4
                        className="min-w-0 truncate text-sm font-black leading-tight text-slate-900"
                        title={skill.name}
                    >
                        {skill.name}
                    </h4>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                    <button
                        type="button"
                        title={
                            skill.isCore
                                ? `${skill.name} 핵심 기술 해제`
                                : `${skill.name} 핵심 기술로 지정`
                        }
                        aria-label={
                            skill.isCore
                                ? `${skill.name} 핵심 기술 해제`
                                : `${skill.name} 핵심 기술로 지정`
                        }
                        aria-pressed={skill.isCore}
                        disabled={isCoreUpdating}
                        onClick={() => onToggleCore(skill)}
                        className={`flex h-6 w-6 items-center justify-center rounded-md transition disabled:cursor-wait disabled:opacity-50 ${
                            skill.isCore
                                ? 'bg-amber-50 text-amber-500 hover:bg-amber-100'
                                : 'text-slate-300 hover:bg-amber-50 hover:text-amber-500'
                        }`}
                    >
                        <Star
                            className={`h-3 w-3 ${skill.isCore ? 'fill-current' : ''} ${isCoreUpdating ? 'animate-pulse' : ''}`}
                        />
                    </button>
                    <button
                        type="button"
                        title={`${skill.name} 수정`}
                        aria-label={`${skill.name} 수정`}
                        onClick={() => onEdit(skill)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                        <Pencil className="h-3 w-3" />
                    </button>
                    <button
                        type="button"
                        title={`${skill.name} 삭제`}
                        aria-label={`${skill.name} 삭제`}
                        onClick={() => onDelete(skill.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-slate-500">
                <span className="inline-flex items-center gap-1">
                    <span
                        className={`h-1.5 w-1.5 rounded-full ${getSkillLevelDotClass(skill.skillLevel)}`}
                    />
                    {skill.skillLevel || '레벨 미지정'}
                </span>
                {skill.skillVersion && (
                    <span className="font-mono text-slate-400">v{skill.skillVersion}</span>
                )}
                <span
                    className={`inline-flex items-center gap-1 rounded border px-1 py-0.5 text-[10px] font-bold ${usage.className}`}
                >
                    <UsageIcon className="h-2.5 w-2.5" /> {usage.label}
                </span>
            </div>

            {skill.comment && (
                <p className="mt-1.5 line-clamp-1 text-[11px] font-medium leading-4 text-slate-500">
                    {skill.comment}
                </p>
            )}
        </article>
    );
}
