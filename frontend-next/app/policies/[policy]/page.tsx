import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isRegistrationPolicyKey, REGISTRATION_POLICIES } from '@/lib/registrationPolicies';

export function generateStaticParams() {
    return [{ policy: 'terms' }, { policy: 'privacy' }, { policy: 'marketing' }];
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ policy: string }>;
}): Promise<Metadata> {
    const { policy: policyKey } = await params;
    if (!isRegistrationPolicyKey(policyKey)) return { title: '정책 | Self-Intro' };
    return { title: `${REGISTRATION_POLICIES[policyKey].title} | Self-Intro` };
}

export default async function RegistrationPolicyPage({
    params,
}: {
    params: Promise<{ policy: string }>;
}) {
    const { policy: policyKey } = await params;
    if (!isRegistrationPolicyKey(policyKey)) notFound();
    const policy = REGISTRATION_POLICIES[policyKey];

    return (
        <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-800">
            <article className="mx-auto max-w-3xl rounded-lg border border-slate-300 bg-white p-6 shadow-sm sm:p-10">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
                    <div>
                        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">
                            {policy.title}
                        </h1>
                    </div>
                    <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${policy.required ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-700'}`}
                    >
                        {policy.required ? '필수' : '선택'}
                    </span>
                </div>
                <div className="mt-5 rounded-md border border-slate-300 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-700">
                    이 문서는 Self-Intro 비공개 베타에 적용됩니다. 유료 공개 서비스 전환 시
                    결제·사업자 정보와 외부 처리 현황을 반영한 개정 내용을 다시 안내합니다.
                </div>
                <p className="mt-5 text-sm leading-6 text-slate-600">{policy.summary}</p>
                <p className="mt-2 text-xs font-bold text-slate-500">버전: {policy.version}</p>
                <div className="mt-8 space-y-8">
                    {policy.sections.map((section) => (
                        <section key={section.heading}>
                            <h2 className="text-lg font-black text-slate-950">{section.heading}</h2>
                            {section.paragraphs.map((paragraph) => (
                                <p
                                    key={paragraph}
                                    className="mt-3 text-sm leading-7 text-slate-700"
                                >
                                    {paragraph}
                                </p>
                            ))}
                            {section.bullets && (
                                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
                                    {section.bullets.map((bullet) => (
                                        <li key={bullet}>{bullet}</li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    ))}
                </div>
                <div className="mt-10 border-t border-slate-200 pt-6">
                    <Link href="/signup" className="text-sm font-black text-indigo-700">
                        가입 화면으로 돌아가기
                    </Link>
                </div>
            </article>
        </main>
    );
}
