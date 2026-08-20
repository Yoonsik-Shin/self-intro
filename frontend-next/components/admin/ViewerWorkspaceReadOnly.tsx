'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Briefcase, Cpu, LogOut, Settings, User } from 'lucide-react';
import { experienceApi, profileApi, skillApi, studyApi } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';
import { useAuthStore } from '@/store/useAuthStore';

type ViewerWorkspaceReadOnlyProps = {
    workspaceSlug: string;
    workspaceName: string;
};

export function ViewerWorkspaceReadOnly({
    workspaceSlug,
    workspaceName,
}: ViewerWorkspaceReadOnlyProps) {
    const router = useRouter();
    const me = useAuthStore((state) => state.me);
    const logout = useAuthStore((state) => state.logout);
    const profile = useQuery({
        queryKey: ['workspace', workspaceSlug, 'viewer', 'profile'],
        queryFn: async () => {
            try {
                return await profileApi.getPrivate(workspaceSlug);
            } catch (error) {
                if (error instanceof ApiError && error.status === 404) return null;
                throw error;
            }
        },
    });
    const experiences = useQuery({
        queryKey: ['workspace', workspaceSlug, 'viewer', 'experiences'],
        queryFn: () => experienceApi.workspaceList(workspaceSlug),
    });
    const skills = useQuery({
        queryKey: ['workspace', workspaceSlug, 'viewer', 'skills'],
        queryFn: () => skillApi.workspaceList(workspaceSlug),
    });
    const studies = useQuery({
        queryKey: ['workspace', workspaceSlug, 'viewer', 'studies'],
        queryFn: () => studyApi.workspaceAdminList(workspaceSlug),
    });

    const isLoading =
        profile.isLoading || experiences.isLoading || skills.isLoading || studies.isLoading;
    const hasError = profile.isError || experiences.isError || skills.isError || studies.isError;

    if (isLoading) {
        return (
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-sm font-bold text-slate-500">비공개 기록을 불러오는 중입니다.</p>
            </section>
        );
    }

    if (hasError) {
        return (
            <section className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
                <h2 className="text-lg font-black text-red-950">기록을 불러오지 못했습니다</h2>
                <p className="mt-2 text-sm leading-6 text-red-700">
                    Membership 상태를 확인하거나 잠시 후 다시 시도해 주세요.
                </p>
            </section>
        );
    }

    const studyItems = studies.data?.content ?? [];

    return (
        <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div>
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                            VIEWER · 읽기 전용
                        </span>
                        <h2 className="mt-4 text-2xl font-black text-slate-950">{workspaceName}</h2>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                            이 Workspace의 비공개 원본을 조회할 수 있습니다. 추가·수정·삭제·발행과
                            AI 생성 기능은 EDITOR 이상에게만 제공됩니다.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/account"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                        >
                            <Settings className="h-4 w-4" aria-hidden="true" />
                            {me?.nickname || me?.username || '계정'}
                        </Link>
                        <button
                            type="button"
                            onClick={() =>
                                void logout().finally(() => {
                                    router.replace('/login');
                                })
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-50"
                        >
                            <LogOut className="h-4 w-4" aria-hidden="true" />
                            로그아웃
                        </button>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    icon={User}
                    label="프로필"
                    value={profile.data?.name || '미작성'}
                    description={profile.data?.jobTitle || '직무 정보 없음'}
                />
                <SummaryCard
                    icon={Briefcase}
                    label="경력·프로젝트"
                    value={`${experiences.data?.length ?? 0}개`}
                    description="Workspace 원본 기록"
                />
                <SummaryCard
                    icon={Cpu}
                    label="기술 스택"
                    value={`${skills.data?.length ?? 0}개`}
                    description={`${skills.data?.filter((skill) => skill.isCore).length ?? 0}개 핵심 기술`}
                />
                <SummaryCard
                    icon={BookOpen}
                    label="학습 기록"
                    value={`${studies.data?.totalElements ?? 0}개`}
                    description={`${studyItems.length}개 목록 표시`}
                />
            </section>

            <ReadOnlyList
                title="경력·프로젝트"
                emptyText="기록된 경력·프로젝트가 없습니다."
                items={(experiences.data ?? []).map((experience) => ({
                    id: experience.id,
                    title: experience.title,
                    meta: [experience.type, experience.companyName, experience.role]
                        .filter(Boolean)
                        .join(' · '),
                    description: experience.summary || experience.takeaway || '요약이 없습니다.',
                }))}
            />

            <ReadOnlyList
                title="기술 스택"
                emptyText="기록된 기술 스택이 없습니다."
                items={(skills.data ?? []).map((skill) => ({
                    id: skill.id,
                    title: skill.name,
                    meta: [skill.category, skill.skillLevel, skill.isCore ? '핵심 기술' : null]
                        .filter(Boolean)
                        .join(' · '),
                    description: skill.comment || skill.usageType || '설명이 없습니다.',
                }))}
            />

            <ReadOnlyList
                title="학습 기록"
                emptyText="기록된 학습이 없습니다."
                items={studyItems.map((study) => ({
                    id: study.id,
                    title: study.title,
                    meta: study.section,
                    description: study.summary || '요약이 없습니다.',
                }))}
            />
        </div>
    );
}

function SummaryCard({
    icon: Icon,
    label,
    value,
    description,
}: {
    icon: typeof User;
    label: string;
    value: string;
    description: string;
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-black">{label}</span>
            </div>
            <p className="mt-3 truncate text-xl font-black text-slate-950">{value}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{description}</p>
        </article>
    );
}

function ReadOnlyList({
    title,
    emptyText,
    items,
}: {
    title: string;
    emptyText: string;
    items: Array<{ id: number; title: string; meta: string; description: string }>;
}) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h3 className="text-lg font-black text-slate-950">{title}</h3>
            {items.length === 0 ? (
                <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                    {emptyText}
                </p>
            ) : (
                <ul className="mt-5 divide-y divide-slate-100">
                    {items.map((item) => (
                        <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h4 className="font-black text-slate-900">{item.title}</h4>
                                <span className="text-xs font-bold text-slate-400">
                                    {item.meta}
                                </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                {item.description}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
