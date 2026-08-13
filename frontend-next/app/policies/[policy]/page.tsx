import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isRegistrationPolicyKey, REGISTRATION_POLICIES } from '@/lib/registrationPolicies';

export function generateStaticParams() {
    return [{ policy: 'terms' }, { policy: 'privacy' }, { policy: 'marketing' }];
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
            <article className="mx-auto max-w-3xl rounded-3xl border border-slate-300 bg-white p-6 shadow-sm sm:p-10">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-700">
                            Registration policy
                        </p>
                        <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
                            {policy.title}
                        </h1>
                    </div>
                    <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${policy.required ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-700'}`}
                    >
                        {policy.required ? '필수' : '선택'}
                    </span>
                </div>
                <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950">
                    로컬 비공개 베타용 정책 초안입니다. 정식 배포 전 “운영 전 확정 필요” 항목을 실제
                    운영 정보로 교체하고 법률 검토가 필요합니다.
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
