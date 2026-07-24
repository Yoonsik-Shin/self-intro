import { Award, GraduationCap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Experience } from '@/lib/api/types';
import { resumeMarkdownComponents } from '@/lib/markdown';
import { formatCredentialPeriod } from '@/lib/format';
import { RelatedStudyNotes } from './RelatedStudyNotes';

const badgeStyle =
    'resume-badge text-[10.5px] bg-slate-50 border border-slate-200/70 text-slate-600 font-medium px-1.5 py-0.5 rounded';
const cardStyle =
    'resume-section-card bg-white border border-slate-200/60 rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_20px_-2px_rgba(15,23,42,0.08)] transition-all duration-300 relative';

type Props = {
    educationExperiences: Experience[];
    certificateExperiences: Experience[];
};

export function CredentialsSection({ educationExperiences, certificateExperiences }: Props) {
    return (
        <section id="credentials" className="scroll-mt-24 space-y-6">
            <div className={cardStyle}>
                <div className="border-b border-slate-100 pb-4">
                    <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                        <GraduationCap className="h-5 w-5 text-slate-900" />
                        학력 · 교육 및 자격증
                    </h2>
                </div>

                <div className="mt-6 grid gap-8 lg:grid-cols-2">
                    <div>
                        <h3 className="resume-item-title mb-4 flex items-center gap-2 font-black text-slate-800">
                            <GraduationCap className="h-4 w-4 text-blue-600" />
                            학력 · 교육
                            <span className="resume-meta rounded-full bg-blue-50 px-2 py-0.5 font-bold text-blue-700">
                                {educationExperiences.length}건
                            </span>
                        </h3>
                        {educationExperiences.length > 0 ? (
                            <div className="space-y-3">
                                {educationExperiences.map((education) => (
                                    <article
                                        id={`credential-experience-${education.id}`}
                                        key={education.id}
                                        className="scroll-mt-24 rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <h4 className="resume-subtitle font-black text-slate-800">
                                                    {education.title}
                                                </h4>
                                                <p className="resume-meta mt-0.5 font-semibold text-slate-500">
                                                    {education.institutionName}
                                                </p>
                                            </div>
                                            <span className="resume-label shrink-0 rounded border border-blue-100 bg-blue-50 px-2 py-1 font-bold text-blue-700">
                                                {formatCredentialPeriod(education)}
                                            </span>
                                        </div>
                                        {education.summary && (
                                            <div className="resume-body mt-3 text-slate-600">
                                                <ReactMarkdown
                                                    components={resumeMarkdownComponents}
                                                >
                                                    {education.summary}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                        {education.skills.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1">
                                                {education.skills.map((skill) => (
                                                    <span key={skill.id} className={badgeStyle}>
                                                        {skill.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <RelatedStudyNotes experienceId={education.id} />
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <p className="rounded-xl border border-dashed border-slate-200 p-4 text-slate-400">
                                등록된 학력·교육 정보가 없습니다.
                            </p>
                        )}
                    </div>

                    <div>
                        <h3 className="resume-item-title mb-4 flex items-center gap-2 font-black text-slate-800">
                            <Award className="h-4 w-4 text-amber-600" />
                            자격증
                            <span className="resume-meta rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-700">
                                {certificateExperiences.length}개
                            </span>
                        </h3>
                        {certificateExperiences.length > 0 ? (
                            <div className="space-y-3">
                                {certificateExperiences.map((certificate) => (
                                    <article
                                        id={`credential-experience-${certificate.id}`}
                                        key={certificate.id}
                                        className="scroll-mt-24 rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <h4 className="resume-subtitle font-black text-slate-800">
                                                    {certificate.title}
                                                </h4>
                                                <p className="resume-meta mt-0.5 font-semibold text-slate-500">
                                                    {certificate.issuer}
                                                </p>
                                            </div>
                                            <span className="resume-label shrink-0 rounded border border-amber-100 bg-amber-50 px-2 py-1 font-bold text-amber-700">
                                                {formatCredentialPeriod(certificate)} 취득
                                            </span>
                                        </div>
                                        {certificate.summary && (
                                            <div className="resume-body mt-3 text-slate-600">
                                                <ReactMarkdown
                                                    components={resumeMarkdownComponents}
                                                >
                                                    {certificate.summary}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                        {certificate.skills.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1">
                                                {certificate.skills.map((skill) => (
                                                    <span key={skill.id} className={badgeStyle}>
                                                        {skill.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <RelatedStudyNotes experienceId={certificate.id} />
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <p className="rounded-xl border border-dashed border-slate-200 p-4 text-slate-400">
                                등록된 자격증 정보가 없습니다.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
