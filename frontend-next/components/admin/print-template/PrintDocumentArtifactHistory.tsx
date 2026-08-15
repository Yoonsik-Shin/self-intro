'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Download, FileClock, Loader2 } from 'lucide-react';
import { printTemplateApi } from '@/lib/api';

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export function PrintDocumentArtifactHistory({
    workspaceSlug,
    templateId,
}: {
    workspaceSlug: string;
    templateId: number;
}) {
    const {
        data: artifacts = [],
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['printTemplateArtifacts', workspaceSlug, templateId],
        queryFn: () => printTemplateApi.workspaceArtifacts(workspaceSlug, templateId),
    });

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 px-3 py-4 text-xs font-semibold text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> PDF 이력을 불러오는 중입니다.
            </div>
        );
    }

    if (isError) {
        return (
            <p className="px-3 py-4 text-xs font-semibold text-rose-600">
                PDF 이력을 불러오지 못했습니다.
            </p>
        );
    }

    if (artifacts.length === 0) {
        return (
            <p className="px-3 py-4 text-xs text-slate-400">
                이 출력 서식에 연결된 보존 PDF가 없습니다.
            </p>
        );
    }

    return (
        <ol className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/70">
            {artifacts.map((artifact) => (
                <li
                    key={artifact.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-3 py-3"
                >
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-slate-700">
                                <FileClock className="h-3.5 w-3.5" /> revision #
                                {artifact.revisionId}
                            </span>
                            {artifact.current && (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                    <CheckCircle2 className="h-3 w-3" /> 현재 연결본
                                </span>
                            )}
                            <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                                {artifact.origin === 'EXTERNAL_UPLOAD'
                                    ? '외부 PDF'
                                    : '브라우저 업로드'}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            {formatDate(artifact.createdAt)} · {formatBytes(artifact.contentLength)}
                            {artifact.pageCount ? ` · ${artifact.pageCount}쪽` : ''}
                        </p>
                        <p
                            className="mt-0.5 truncate font-mono text-[10px] text-slate-400"
                            title={artifact.sha256Checksum}
                        >
                            SHA-256 {artifact.sha256Checksum}
                        </p>
                    </div>
                    <a
                        href={artifact.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                        <Download className="h-3.5 w-3.5" /> 열기
                    </a>
                </li>
            ))}
        </ol>
    );
}
