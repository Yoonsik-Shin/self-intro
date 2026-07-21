'use client';

import { Pencil, Star, Trash2 } from 'lucide-react';
import type { Skill } from '@/lib/api/types';
import { SkillBadgeIcon } from '@/lib/SkillBadgeIcon';
import { getSkillLevelDotClass, skillUsagePresentations, type SkillCategoryPresentation } from './skillPresentation';

type SkillManagementCardProps = {
  skill: Skill;
  category: SkillCategoryPresentation;
  onEdit: (skill: Skill) => void;
  onDelete: (id: number) => void;
  onToggleCore: (skill: Skill) => void;
  isCoreUpdating?: boolean;
};

export function SkillManagementCard({ skill, category, onEdit, onDelete, onToggleCore, isCoreUpdating = false }: SkillManagementCardProps) {
  const usage = skillUsagePresentations[skill.usageType] ?? {
    label: skill.usageType,
    Icon: Star,
    className: 'border-slate-200 bg-slate-50 text-slate-600',
  };
  const UsageIcon = usage.Icon;

  return (
    <article className="flex min-h-36 flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">{category.label}</p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            title={skill.isCore ? `${skill.name} 핵심 기술 해제` : `${skill.name} 핵심 기술로 지정`}
            aria-label={skill.isCore ? `${skill.name} 핵심 기술 해제` : `${skill.name} 핵심 기술로 지정`}
            aria-pressed={skill.isCore}
            disabled={isCoreUpdating}
            onClick={() => onToggleCore(skill)}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition disabled:cursor-wait disabled:opacity-50 ${
              skill.isCore ? 'bg-amber-50 text-amber-500 hover:bg-amber-100' : 'text-slate-300 hover:bg-amber-50 hover:text-amber-500'
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${skill.isCore ? 'fill-current' : ''} ${isCoreUpdating ? 'animate-pulse' : ''}`} />
          </button>
          <button type="button" title={`${skill.name} 수정`} aria-label={`${skill.name} 수정`} onClick={() => onEdit(skill)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-900">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" title={`${skill.name} 삭제`} aria-label={`${skill.name} 삭제`} onClick={() => onDelete(skill.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-1 flex min-w-0 items-center gap-2.5">
        <SkillBadgeIcon name={skill.name} badgeKey={skill.badgeKey} badgeColor={skill.badgeColor} className="h-8 w-8" />
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-base font-black leading-tight text-slate-900" title={skill.name}>
            {skill.name}
          </h4>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${getSkillLevelDotClass(skill.skillLevel)}`} />
              {skill.skillLevel || '레벨 미지정'}
            </span>
            {skill.skillVersion && <span className="font-mono text-slate-400">v{skill.skillVersion}</span>}
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-bold ${usage.className}`}>
          <UsageIcon className="h-3 w-3" /> {usage.label}
        </span>
      </div>

      <p className={`mt-2.5 line-clamp-2 text-xs font-medium leading-4 ${skill.comment ? 'text-slate-500' : 'italic text-slate-300'}`}>{skill.comment || '설명이 등록되지 않았습니다.'}</p>
    </article>
  );
}
