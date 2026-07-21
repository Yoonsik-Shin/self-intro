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
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                        <CategoryIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900">{category.label}</h3>
                            <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-bold text-slate-500">
                                {skills.length}개
                            </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                            {category.description}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {skills.map((skill) => (
                    <SkillManagementCard
                        key={skill.id}
                        skill={skill}
                        category={category}
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
