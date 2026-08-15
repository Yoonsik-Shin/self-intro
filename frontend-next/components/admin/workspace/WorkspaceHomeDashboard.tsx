'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, BriefcaseBusiness, Cpu, Radio, Sparkles } from 'lucide-react';
import { competencyApi } from '@/lib/api/competency';
import { experienceApi } from '@/lib/api/experience';
import { jobPostingApi } from '@/lib/api/jobPosting';
import { publicationApi } from '@/lib/api/publication';
import { skillApi } from '@/lib/api/skill';
import { studyApi } from '@/lib/api/study';

export type WorkspaceHomeDestination =
    'EXPERIENCE' | 'STUDY' | 'SKILLS' | 'COMPETENCIES' | 'JOB_APPLICATIONS' | 'PUBLICATION';

type Props = {
    workspaceSlug: string;
    workspaceName: string;
    workspaceRole: string;
    onNavigate: (destination: WorkspaceHomeDestination) => void;
};

type SummaryCardProps = {
    label: string;
    value: string;
    description: string;
    icon: typeof BriefcaseBusiness;
    loading: boolean;
    error: boolean;
    onClick: () => void;
};

function SummaryCard({
    label,
    value,
    description,
    icon: Icon,
    loading,
    error,
    onClick,
}: SummaryCardProps) {
    const displayValue = loading ? '…' : error ? '확인 필요' : value;

    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex min-h-44 flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
            <span className="flex items-center justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-indigo-50 group-hover:text-indigo-700">
                    <Icon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
            </span>
            <span className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                {label}
            </span>
            <strong
                className={`mt-1 text-2xl font-black ${error ? 'text-rose-600' : 'text-slate-950'}`}
            >
                {displayValue}
            </strong>
            <span className="mt-2 text-sm leading-5 text-slate-500">{description}</span>
        </button>
    );
}

export function WorkspaceHomeDashboard({
    workspaceSlug,
    workspaceName,
    workspaceRole,
    onNavigate,
}: Props) {
    const experienceQuery = useQuery({
        queryKey: ['experiences', workspaceSlug],
        queryFn: () => experienceApi.workspaceList(workspaceSlug),
    });
    const studyQuery = useQuery({
        queryKey: ['studies', 'workspace', workspaceSlug],
        queryFn: () => studyApi.workspaceAdminList(workspaceSlug),
    });
    const skillQuery = useQuery({
        queryKey: ['skills', workspaceSlug],
        queryFn: () => skillApi.workspaceList(workspaceSlug),
    });
    const competencyQuery = useQuery({
        queryKey: ['competencies', 'workspace', workspaceSlug],
        queryFn: () => competencyApi.workspaceList(workspaceSlug),
    });
    const applicationQuery = useQuery({
        queryKey: ['job-applications', 'workspace', workspaceSlug],
        queryFn: () => jobPostingApi.workspaceList(workspaceSlug),
    });
    const publicationQuery = useQuery({
        queryKey: ['workspace-publication', workspaceSlug],
        queryFn: () => publicationApi.status(workspaceSlug),
    });

    const sourceRecordCount =
        (experienceQuery.data?.length ?? 0) + (studyQuery.data?.totalElements ?? 0);
    const sourceRecordLoading = experienceQuery.isLoading || studyQuery.isLoading;
    const sourceRecordError = experienceQuery.isError || studyQuery.isError;
    const published = publicationQuery.data?.publicationStatus === 'PUBLISHED';
    const publicationValue = published
        ? `공개 중 · v${publicationQuery.data?.revisionNumber ?? '-'}`
        : '비공개';

    return (
        <section className="space-y-6">
            <header className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-7 shadow-sm sm:p-8">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
                    Workspace Home
                </span>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-950">{workspaceName}</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                            원본 기록부터 공개본과 지원 현황까지, 현재 Workspace의 상태를 한눈에
                            확인합니다. 각 카드를 누르면 해당 관리 화면으로 이동합니다.
                        </p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600">
                        {workspaceRole}
                    </span>
                </div>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <SummaryCard
                    label="원본 기록"
                    value={`${sourceRecordCount}개`}
                    description="경력·프로젝트와 학습 기록의 합계"
                    icon={BriefcaseBusiness}
                    loading={sourceRecordLoading}
                    error={sourceRecordError}
                    onClick={() => onNavigate('EXPERIENCE')}
                />
                <SummaryCard
                    label="학습 기록"
                    value={`${studyQuery.data?.totalElements ?? 0}개`}
                    description="Workspace에 축적한 학습 문서"
                    icon={BookOpen}
                    loading={studyQuery.isLoading}
                    error={studyQuery.isError}
                    onClick={() => onNavigate('STUDY')}
                />
                <SummaryCard
                    label="기술 스택"
                    value={`${skillQuery.data?.length ?? 0}개`}
                    description="공통 카탈로그와 연결한 Workspace 기술"
                    icon={Cpu}
                    loading={skillQuery.isLoading}
                    error={skillQuery.isError}
                    onClick={() => onNavigate('SKILLS')}
                />
                <SummaryCard
                    label="역량 원본"
                    value={`${competencyQuery.data?.length ?? 0}개`}
                    description="경험 근거와 연결한 대표 역량"
                    icon={Sparkles}
                    loading={competencyQuery.isLoading}
                    error={competencyQuery.isError}
                    onClick={() => onNavigate('COMPETENCIES')}
                />
                <SummaryCard
                    label="지원 현황"
                    value={`${applicationQuery.data?.length ?? 0}건`}
                    description="현재 Workspace에서 관리하는 지원 기록"
                    icon={BriefcaseBusiness}
                    loading={applicationQuery.isLoading}
                    error={applicationQuery.isError}
                    onClick={() => onNavigate('JOB_APPLICATIONS')}
                />
                <SummaryCard
                    label="공개 페이지"
                    value={publicationValue}
                    description={
                        published
                            ? '방문자에게 노출 중인 공개 revision'
                            : '발행 전이거나 공개를 중지한 상태'
                    }
                    icon={Radio}
                    loading={publicationQuery.isLoading}
                    error={publicationQuery.isError}
                    onClick={() => onNavigate('PUBLICATION')}
                />
            </div>
        </section>
    );
}
