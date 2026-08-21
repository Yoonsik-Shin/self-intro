'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, UserRound } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useRecentReauthentication } from '@/hooks/useRecentReauthentication';
import { workspaceApi, type WorkspaceRole, type WorkspaceType } from '@/lib/api';

export function WorkspaceTypeSettings({
    workspaceSlug,
    role,
}: {
    workspaceSlug: string;
    role: WorkspaceRole;
}) {
    const queryClient = useQueryClient();
    const { isReauthenticated } = useRecentReauthentication();
    const typeQuery = useQuery({
        queryKey: ['workspace', workspaceSlug, 'type'],
        queryFn: () => workspaceApi.type(workspaceSlug),
    });
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const change = async (type: WorkspaceType) => {
        setPending(true);
        setMessage(null);
        try {
            await workspaceApi.changeType(workspaceSlug, type);
            await queryClient.invalidateQueries({ queryKey: ['workspace', workspaceSlug, 'type'] });
            setMessage(
                type === 'ORGANIZATION'
                    ? '기업·팀 소개 Workspace로 변경했습니다.'
                    : '개인 소개 Workspace로 변경했습니다.'
            );
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : 'Workspace 유형을 변경하지 못했습니다.'
            );
        } finally {
            setPending(false);
        }
    };

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="font-black text-slate-950">소개 주체</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                개인 경력 소개와 기업·팀 소개를 구분합니다. 요금제와 멤버십은 이 유형과 독립적으로
                유지됩니다.
            </p>
            <div className="mt-5 grid max-w-2xl gap-3 sm:grid-cols-2">
                <TypeButton
                    icon={<UserRound className="h-5 w-5" />}
                    title="개인"
                    description="개인의 경력, 학습과 포트폴리오를 소개합니다."
                    selected={typeQuery.data?.type === 'PERSONAL'}
                    disabled={role !== 'OWNER' || !isReauthenticated || pending}
                    onClick={() => void change('PERSONAL')}
                />
                <TypeButton
                    icon={<Building2 className="h-5 w-5" />}
                    title="기업·팀"
                    description="회사, 조직 또는 팀의 소개와 구성원 콘텐츠를 운영합니다."
                    selected={typeQuery.data?.type === 'ORGANIZATION'}
                    disabled={role !== 'OWNER' || !isReauthenticated || pending}
                    onClick={() => void change('ORGANIZATION')}
                />
            </div>
            {role !== 'OWNER' && (
                <p className="mt-3 text-xs text-slate-500">OWNER만 유형을 변경할 수 있습니다.</p>
            )}
            {role === 'OWNER' && !isReauthenticated && (
                <p className="mt-3 text-xs text-amber-700">
                    상단에서 중요 작업 인증을 먼저 완료해 주세요.
                </p>
            )}
            {message && <p className="mt-3 text-sm font-bold text-slate-700">{message}</p>}
        </section>
    );
}

function TypeButton({
    icon,
    title,
    description,
    selected,
    disabled,
    onClick,
}: {
    icon: ReactNode;
    title: string;
    description: string;
    selected: boolean;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled || selected}
            onClick={onClick}
            className={`min-h-24 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed ${
                selected
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400 disabled:opacity-50'
            }`}
        >
            <span className="flex items-center gap-2 font-black">
                {icon} {title}
            </span>
            <span
                className={`mt-2 block text-xs leading-5 ${selected ? 'text-slate-300' : 'text-slate-500'}`}
            >
                {description}
            </span>
        </button>
    );
}
