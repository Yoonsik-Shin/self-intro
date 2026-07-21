'use client';

import { useMemo, useState } from 'react';
import { Cpu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Experience, Skill } from '@/lib/api/types';
import { groupCoreSkills, type Milestone } from '@/lib/introDerivations';
import { getDisplayCategory } from '@/lib/skillCategory';
import { SkillBadgeIcon } from '@/lib/SkillBadgeIcon';
import { resumeMarkdownComponents } from '@/lib/markdown';
import { RelatedStudyNotes } from './RelatedStudyNotes';
import { scrollToSection } from '@/lib/scroll';

const DISPLAY_CATEGORIES = [
    'Backend & Language',
    'Frontend',
    'Database',
    'DevOps & Infra',
    'AI / RAG',
    'Others',
];

type Props = {
    skills: Skill[];
    experiences: Experience[];
    milestones: Milestone[];
    onSelectMilestone: (id: string) => void;
};

export function SkillsSection({ skills, experiences, milestones, onSelectMilestone }: Props) {
    const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);
    const groups = useMemo(() => groupCoreSkills(skills), [skills]);
    const selectedSkill = useMemo(
        () => groups.flatMap((g) => g.skills).find((s) => s.id === selectedSkillId),
        [groups, selectedSkillId]
    );

    const selectedSkillExperiences = useMemo(() => {
        if (!selectedSkill) return [];
        return experiences
            .filter((experience) =>
                experience.skills.some((skill) => skill.id === selectedSkill.id)
            )
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((experience) => ({
                id: experience.id.toString(),
                type: experience.type,
                title: experience.title,
                period: `${experience.periodStart.replace(/-/g, '.').substring(0, 7)} - ${experience.periodEnd ? experience.periodEnd.replace(/-/g, '.').substring(0, 7) : '진행 중'}`,
                role:
                    experience.role ??
                    experience.companyName ??
                    experience.institutionName ??
                    experience.issuer ??
                    '',
                summary: experience.summary ?? experience.details?.[0]?.content ?? '',
            }));
    }, [experiences, selectedSkill]);

    const cardStyle =
        'resume-section-card bg-white border border-slate-200/60 rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_-2px_rgba(15,23,42,0.08)] transition-all duration-300 relative';

    return (
        <section id="skills" className="scroll-mt-24 space-y-6">
            <div className={cardStyle}>
                <h2 className="resume-section-title mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 font-black text-slate-900">
                    <Cpu className="h-5 w-5 text-slate-900" />
                    기술 스택
                </h2>
                <div className="resume-skill-groups space-y-5">
                    {groups.map((group) => (
                        <div key={group.value} className="resume-skill-group space-y-4">
                            <h4 className="resume-skill-group-title resume-subtitle flex items-center gap-2 border-b border-slate-100 pb-1.5 font-black text-slate-500">
                                <span
                                    className="resume-skill-group-bar h-4 w-1 shrink-0 rounded-full bg-slate-900"
                                    aria-hidden
                                />
                                {group.label}
                            </h4>
                            {group.skills.length === 0 ? (
                                <p className="border-l-4 border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-400">
                                    선택된 기술이 없습니다.
                                </p>
                            ) : (
                                <div className="space-y-4 pl-1">
                                    {DISPLAY_CATEGORIES.map((cat) => {
                                        const catSkills = group.skills.filter(
                                            (s) => getDisplayCategory(s) === cat
                                        );
                                        if (catSkills.length === 0) return null;
                                        return (
                                            <div key={cat} className="space-y-2">
                                                <h5 className="resume-label font-black uppercase tracking-wider text-slate-400">
                                                    {cat}
                                                </h5>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {catSkills.map((skill) => (
                                                        <button
                                                            type="button"
                                                            key={skill.id}
                                                            onClick={() =>
                                                                setSelectedSkillId((current) =>
                                                                    current === skill.id
                                                                        ? null
                                                                        : skill.id
                                                                )
                                                            }
                                                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left transition ${
                                                                selectedSkillId === skill.id
                                                                    ? 'border-slate-500 bg-slate-900 text-white shadow-sm shadow-slate-800/20'
                                                                    : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-100/50'
                                                            }`}
                                                        >
                                                            <SkillBadgeIcon
                                                                name={skill.name}
                                                                badgeKey={skill.badgeKey}
                                                                badgeColor={skill.badgeColor}
                                                                className="h-5 w-5"
                                                            />
                                                            <span className="resume-badge font-black">
                                                                {skill.name}
                                                            </span>
                                                            {skill.skillVersion && (
                                                                <span
                                                                    className={`shrink-0 rounded-md border px-1 py-0.5 text-[10px] font-black leading-none ${
                                                                        selectedSkillId === skill.id
                                                                            ? 'border-white/25 bg-white/15 text-white'
                                                                            : 'border-slate-200 bg-slate-50 text-slate-500'
                                                                    }`}
                                                                >
                                                                    v{skill.skillVersion}
                                                                </span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}

                    {selectedSkill && (
                        <div className="border-t border-slate-200 pt-5 print:hidden">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-3">
                                    <SkillBadgeIcon
                                        name={selectedSkill.name}
                                        badgeKey={selectedSkill.badgeKey}
                                        badgeColor={selectedSkill.badgeColor}
                                        className="h-9 w-9"
                                    />
                                    <div className="min-w-0">
                                        <span className="resume-label font-black text-slate-900">
                                            이 기술을 사용한 경험
                                        </span>
                                        <h4 className="resume-item-title mt-0.5 font-black text-slate-900">
                                            {selectedSkill.name}
                                        </h4>
                                        {selectedSkill.skillVersion && (
                                            <p className="resume-meta mt-0.5 font-bold text-slate-500">
                                                v{selectedSkill.skillVersion}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <span className="resume-meta rounded-md bg-slate-100 px-2.5 py-1 font-black text-slate-900">
                                    연결된 경험 {selectedSkillExperiences.length}개
                                </span>
                            </div>

                            {selectedSkill.comment && (
                                <p className="resume-body mt-3 text-slate-600">
                                    {selectedSkill.comment}
                                </p>
                            )}

                            <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
                                {selectedSkillExperiences.length > 0 ? (
                                    selectedSkillExperiences.map((experience) => (
                                        <button
                                            type="button"
                                            key={experience.id}
                                            onClick={() => {
                                                const milestone = milestones.find(
                                                    (item) => item.title === experience.title
                                                );
                                                if (milestone) onSelectMilestone(milestone.id);
                                                scrollToSection('projects');
                                            }}
                                            className="w-full px-1 py-3.5 text-left transition hover:bg-slate-100/40 sm:px-2"
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="resume-label rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-black text-slate-500">
                                                    {experience.type}
                                                </span>
                                                <span className="resume-meta font-black text-slate-400">
                                                    {experience.period}
                                                </span>
                                            </div>
                                            <p className="resume-subtitle mt-1.5 font-black text-slate-900">
                                                {experience.title}
                                            </p>
                                            {experience.role && (
                                                <p className="resume-meta mt-0.5 font-black text-slate-900">
                                                    {experience.role}
                                                </p>
                                            )}
                                            {experience.summary && (
                                                <div className="resume-meta mt-1.5 line-clamp-2 font-semibold text-slate-600">
                                                    <ReactMarkdown
                                                        components={resumeMarkdownComponents}
                                                    >
                                                        {experience.summary}
                                                    </ReactMarkdown>
                                                </div>
                                            )}
                                        </button>
                                    ))
                                ) : (
                                    <p className="px-1 py-3 text-sm font-bold text-slate-400">
                                        연결된 experience가 없습니다.
                                    </p>
                                )}
                            </div>
                            {selectedSkill.id > 0 && (
                                <RelatedStudyNotes skillId={selectedSkill.id} />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
