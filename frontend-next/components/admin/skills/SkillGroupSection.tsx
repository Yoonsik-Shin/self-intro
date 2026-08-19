'use client';

import type { Skill } from '@/lib/api/types';
import { SkillManagementCard } from './SkillManagementCard';
import type { SkillCategoryPresentation } from './skillPresentation';

type SkillGroupSectionProps = {
    category: SkillCategoryPresentation;
    skills: Skill[];
    onEdit: (skill: Skill) => void;
    onDelete: (id: number) => void;
    onToggleCore: (skill: Skill) => void;
    updatingCoreSkillId?: number;
};

export function SkillGroupSection({
    category,
    skills,
    onEdit,
    onDelete,
    onToggleCore,
    updatingCoreSkillId,
}: SkillGroupSectionProps) {
    const CategoryIcon = category.Icon;

    return (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-3 py-2 sm:px-4">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500">
                    <CategoryIcon className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-sm font-black text-slate-900">{category.label}</h3>
                <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-500">
                    {skills.length}개
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {skills.map((skill) => (
                    <SkillManagementCard
                        key={skill.id}
                        skill={skill}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onToggleCore={onToggleCore}
                        isCoreUpdating={updatingCoreSkillId === skill.id}
                    />
                ))}
            </div>
        </section>
    );
}
