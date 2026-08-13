'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ExternalLink, ImagePlus, Link2, LoaderCircle, Save, Trash2 } from 'lucide-react';
import { imageApi, jobPostingApi } from '@/lib/api';
import type {
    JobApplicationUrlParseResponse,
    JobPostingStatus,
    WorkspacePrivateJobPostingRequest,
} from '@/lib/api/types';

type ImportMethod = 'URL' | 'MANUAL' | 'SCREENSHOT';

type ScreenshotUpload = {
    uploadId: string;
    name: string;
    previewUrl: string;
    size: number;
};

const MAX_SCREENSHOT_COUNT = 5;
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;
const MAX_SCREENSHOT_TOTAL_BYTES = 25 * 1024 * 1024;
const ALLOWED_SCREENSHOT_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const emptyForm = (): WorkspacePrivateJobPostingRequest => ({
    companyName: '',
    positionTitle: '',
    postingUrl: null,
    deadline: null,
    deadlineTime: null,
    alwaysOpen: false,
    salaryNote: null,
    location: null,
    employmentType: null,
    requiredSkillsRaw: null,
    jobDescription: null,
    requiredQualifications: null,
    preferredQualifications: null,
    hiringProcess: null,
    applicationMethod: null,
    compensationDetail: null,
    status: 'NEW',
    appliedAt: null,
    memo: null,
    interestLevel: 3,
    matchScore: null,
    matchReason: null,
});

export function WorkspacePrivateJobImport({
    workspaceSlug,
    method,
    onCreated,
}: {
    workspaceSlug: string;
    method: ImportMethod;
    onCreated: () => void | Promise<void>;
}) {
    const [sourceUrl, setSourceUrl] = useState('');
    const [form, setForm] = useState<WorkspacePrivateJobPostingRequest>(() => emptyForm());
    const [message, setMessage] = useState<string | null>(null);
    const [messageKind, setMessageKind] = useState<'info' | 'success' | 'error'>('info');
    const [screenshots, setScreenshots] = useState<ScreenshotUpload[]>([]);
    const screenshotsRef = useRef<ScreenshotUpload[]>([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        screenshotsRef.current = screenshots;
    }, [screenshots]);
    useEffect(
        () => () =>
            screenshotsRef.current.forEach((screenshot) =>
                URL.revokeObjectURL(screenshot.previewUrl)
            ),
        []
    );

    const parseMutation = useMutation({
        mutationFn: () =>
            jobPostingApi.workspaceParsePrivateSourceUrl(workspaceSlug, sourceUrl.trim()),
        onSuccess: (parsed) => {
            setForm((current) => fromParsed(current, parsed));
            setMessageKind('info');
            setMessage('AI가 읽은 결과입니다. 저장하기 전에 반드시 원문과 비교해 주세요.');
        },
        onError: (error) => showError(error, 'URL을 읽지 못했습니다.'),
    });
    const createMutation = useMutation({
        mutationFn: () => jobPostingApi.workspaceCreatePrivateSource(workspaceSlug, form),
        onSuccess: async () => {
            setForm(emptyForm());
            setSourceUrl('');
            setMessage(null);
            await onCreated();
        },
        onError: (error) => showError(error, '저장하지 못했습니다.'),
    });
    const screenshotParseMutation = useMutation({
        mutationFn: () =>
            jobPostingApi.workspaceParsePrivateSourceScreenshots(
                workspaceSlug,
                screenshots.map((screenshot) => screenshot.uploadId)
            ),
        onSuccess: (parsed) => {
            setForm((current) => ({ ...fromParsed(current, parsed), source: 'IMAGE_INGEST' }));
            screenshots.forEach((screenshot) => URL.revokeObjectURL(screenshot.previewUrl));
            setScreenshots([]);
            setMessageKind('success');
            setMessage(
                '이미지 원본은 삭제했습니다. 분석 결과를 원문과 비교한 뒤 비공개 저장해 주세요.'
            );
        },
        onError: async (error) => {
            const failedUploads = [...screenshots];
            await Promise.all(
                failedUploads.map((screenshot) =>
                    jobPostingApi
                        .workspaceCancelScreenshotUpload(workspaceSlug, screenshot.uploadId)
                        .catch(() => undefined)
                )
            );
            failedUploads.forEach((screenshot) => URL.revokeObjectURL(screenshot.previewUrl));
            setScreenshots([]);
            showError(error, '스크린샷을 분석하지 못했습니다.');
        },
    });

    const showError = (error: unknown, fallback: string) => {
        setMessageKind('error');
        setMessage(error instanceof Error ? error.message : fallback);
    };

    const uploadScreenshots = async (files: File[]) => {
        if (files.length === 0) return;
        if (screenshots.length + files.length > MAX_SCREENSHOT_COUNT) {
            setMessageKind('error');
            setMessage('스크린샷은 최대 5장까지 추가할 수 있습니다.');
            return;
        }
        if (files.some((file) => !ALLOWED_SCREENSHOT_TYPES.has(file.type))) {
            setMessageKind('error');
            setMessage('PNG, JPEG, WebP 이미지만 업로드할 수 있습니다.');
            return;
        }
        if (files.some((file) => file.size <= 0 || file.size > MAX_SCREENSHOT_BYTES)) {
            setMessageKind('error');
            setMessage('이미지 한 장은 8MB 이하여야 합니다.');
            return;
        }
        const currentBytes = screenshots.reduce((sum, screenshot) => sum + screenshot.size, 0);
        if (
            currentBytes + files.reduce((sum, file) => sum + file.size, 0) >
            MAX_SCREENSHOT_TOTAL_BYTES
        ) {
            setMessageKind('error');
            setMessage('한 번에 분석할 이미지의 전체 크기는 25MB 이하여야 합니다.');
            return;
        }
        setUploading(true);
        setMessage(null);
        const issued: ScreenshotUpload[] = [];
        try {
            for (const file of files) {
                const ticket = await jobPostingApi.workspaceIssueScreenshotUpload(
                    workspaceSlug,
                    file.name,
                    file.type,
                    file.size
                );
                try {
                    await imageApi.uploadPrivateToPresignedUrl(ticket.uploadUrl, file);
                } catch (error) {
                    await jobPostingApi
                        .workspaceCancelScreenshotUpload(workspaceSlug, ticket.uploadId)
                        .catch(() => undefined);
                    throw error;
                }
                issued.push({
                    uploadId: ticket.uploadId,
                    name: file.name,
                    previewUrl: URL.createObjectURL(file),
                    size: file.size,
                });
            }
            setScreenshots((current) => [...current, ...issued]);
        } catch (error) {
            await Promise.all(
                issued.map((upload) =>
                    jobPostingApi
                        .workspaceCancelScreenshotUpload(workspaceSlug, upload.uploadId)
                        .catch(() => undefined)
                )
            );
            issued.forEach((upload) => URL.revokeObjectURL(upload.previewUrl));
            showError(error, '이미지를 업로드하지 못했습니다.');
        } finally {
            setUploading(false);
        }
    };

    const removeScreenshot = async (target: ScreenshotUpload) => {
        setScreenshots((current) => current.filter((item) => item.uploadId !== target.uploadId));
        URL.revokeObjectURL(target.previewUrl);
        await jobPostingApi
            .workspaceCancelScreenshotUpload(workspaceSlug, target.uploadId)
            .catch(() => {
                setMessageKind('error');
                setMessage('임시 파일은 만료 정리에서 삭제됩니다.');
            });
    };

    const set = <K extends keyof WorkspacePrivateJobPostingRequest>(
        key: K,
        value: WorkspacePrivateJobPostingRequest[K]
    ) => setForm((current) => ({ ...current, [key]: value }));

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                <h3 className="text-base font-black text-slate-900">
                    {method === 'URL'
                        ? '원본 URL에서 가져오기'
                        : method === 'SCREENSHOT'
                          ? '스크린샷에서 가져오기'
                          : '공고 직접 입력'}
                </h3>
                <p className="text-sm text-slate-500">
                    현재 Workspace에만 저장되며 플랫폼 공통 공고로 공개되지 않습니다.
                </p>
            </div>

            {method === 'URL' && (
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-4 py-3">
                        <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
                        <input
                            type="url"
                            value={sourceUrl}
                            onChange={(event) => setSourceUrl(event.target.value)}
                            placeholder="https:// 채용 공고 원본 URL"
                            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                        />
                    </label>
                    <button
                        type="button"
                        disabled={!sourceUrl.trim() || parseMutation.isPending}
                        onClick={() => parseMutation.mutate()}
                        className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-500"
                    >
                        {parseMutation.isPending ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                            <ExternalLink className="h-4 w-4" />
                        )}
                        내용 불러오기
                    </button>
                </div>
            )}

            {method === 'SCREENSHOT' && (
                <div className="mt-5 space-y-4">
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-5 text-sm font-bold text-slate-700 hover:border-slate-500">
                        {uploading ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                            <ImagePlus className="h-4 w-4" />
                        )}
                        PNG·JPEG·WebP 추가 (최대 5장, 장당 8MB)
                        <input
                            type="file"
                            multiple
                            accept="image/png,image/jpeg,image/webp"
                            disabled={uploading || screenshotParseMutation.isPending}
                            className="sr-only"
                            onChange={(event) => {
                                void uploadScreenshots(Array.from(event.target.files ?? []));
                                event.target.value = '';
                            }}
                        />
                    </label>
                    {screenshots.length > 0 && (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {screenshots.map((screenshot) => (
                                <article
                                    key={screenshot.uploadId}
                                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={screenshot.previewUrl}
                                        alt="업로드할 채용 공고 스크린샷"
                                        className="h-32 w-full object-cover"
                                    />
                                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                                        <span className="min-w-0 truncate text-xs font-bold text-slate-600">
                                            {screenshot.name}
                                        </span>
                                        <button
                                            type="button"
                                            aria-label="스크린샷 제거"
                                            onClick={() => void removeScreenshot(screenshot)}
                                            disabled={
                                                uploading || screenshotParseMutation.isPending
                                            }
                                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                    <button
                        type="button"
                        disabled={
                            screenshots.length === 0 ||
                            uploading ||
                            screenshotParseMutation.isPending
                        }
                        onClick={() => screenshotParseMutation.mutate()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-500"
                    >
                        {screenshotParseMutation.isPending && (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        )}
                        분석하고 원본 즉시 삭제
                    </button>
                    <p className="text-xs text-slate-500">
                        업로드 파일은 비공개 임시 저장소에 보관하며 분석 직후 삭제합니다. 이탈한
                        파일도 30분 후 정리됩니다.
                    </p>
                </div>
            )}

            {message && (
                <p
                    role={messageKind === 'error' ? 'alert' : 'status'}
                    className={`mt-3 rounded-xl border px-4 py-3 text-xs font-bold ${
                        messageKind === 'error'
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : messageKind === 'success'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-100 text-slate-600'
                    }`}
                >
                    {message}
                </p>
            )}

            <form
                className="mt-5 space-y-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    createMutation.mutate();
                }}
            >
                <div className="grid gap-4 md:grid-cols-2">
                    <ImportField label="회사명" required>
                        <input
                            required
                            maxLength={100}
                            value={form.companyName}
                            onChange={(e) => set('companyName', e.target.value)}
                            className="workspace-input"
                        />
                    </ImportField>
                    <ImportField label="직무명" required>
                        <input
                            required
                            maxLength={150}
                            value={form.positionTitle}
                            onChange={(e) => set('positionTitle', e.target.value)}
                            className="workspace-input"
                        />
                    </ImportField>
                    <ImportField label="원본 URL">
                        <input
                            type="url"
                            maxLength={500}
                            value={form.postingUrl ?? ''}
                            onChange={(e) => set('postingUrl', e.target.value || null)}
                            className="workspace-input"
                        />
                    </ImportField>
                    <ImportField label="지역">
                        <input
                            maxLength={100}
                            value={form.location ?? ''}
                            onChange={(e) => set('location', e.target.value || null)}
                            className="workspace-input"
                        />
                    </ImportField>
                    <ImportField label="고용 형태">
                        <input
                            maxLength={50}
                            value={form.employmentType ?? ''}
                            onChange={(e) => set('employmentType', e.target.value || null)}
                            className="workspace-input"
                        />
                    </ImportField>
                    <ImportField label="마감일">
                        <input
                            type="date"
                            disabled={form.alwaysOpen}
                            value={form.deadline ?? ''}
                            onChange={(e) => set('deadline', e.target.value || null)}
                            className="workspace-input"
                        />
                    </ImportField>
                    <ImportField label="관심도">
                        <input
                            type="number"
                            min={1}
                            max={5}
                            value={form.interestLevel ?? ''}
                            onChange={(e) =>
                                set('interestLevel', e.target.value ? Number(e.target.value) : null)
                            }
                            className="workspace-input"
                        />
                    </ImportField>
                    <ImportField label="초기 상태">
                        <select
                            value={form.status}
                            onChange={(e) => set('status', e.target.value as JobPostingStatus)}
                            className="workspace-input"
                        >
                            <option value="NEW">검토 전</option>
                            <option value="SAVED">관심 공고</option>
                            <option value="APPLIED">지원 완료</option>
                        </select>
                    </ImportField>
                </div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    <input
                        type="checkbox"
                        checked={form.alwaysOpen}
                        onChange={(e) =>
                            setForm((current) => ({
                                ...current,
                                alwaysOpen: e.target.checked,
                                deadline: e.target.checked ? null : current.deadline,
                            }))
                        }
                    />
                    상시 채용
                </label>
                <ImportField label="직무 상세">
                    <textarea
                        rows={5}
                        value={form.jobDescription ?? ''}
                        onChange={(e) => set('jobDescription', e.target.value || null)}
                        className="workspace-input resize-y"
                    />
                </ImportField>
                <div className="grid gap-4 md:grid-cols-2">
                    <ImportField label="지원 자격">
                        <textarea
                            rows={4}
                            value={form.requiredQualifications ?? ''}
                            onChange={(e) => set('requiredQualifications', e.target.value || null)}
                            className="workspace-input resize-y"
                        />
                    </ImportField>
                    <ImportField label="우대 사항">
                        <textarea
                            rows={4}
                            value={form.preferredQualifications ?? ''}
                            onChange={(e) => set('preferredQualifications', e.target.value || null)}
                            className="workspace-input resize-y"
                        />
                    </ImportField>
                </div>
                <ImportField label="내 메모">
                    <textarea
                        rows={3}
                        value={form.memo ?? ''}
                        onChange={(e) => set('memo', e.target.value || null)}
                        className="workspace-input resize-y"
                    />
                </ImportField>
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                        {createMutation.isPending ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        내 Workspace에 비공개 저장
                    </button>
                </div>
            </form>
        </section>
    );
}

function fromParsed(
    current: WorkspacePrivateJobPostingRequest,
    parsed: JobApplicationUrlParseResponse
): WorkspacePrivateJobPostingRequest {
    return {
        ...current,
        companyName: parsed.companyName ?? '',
        positionTitle: parsed.positionTitle ?? '',
        postingUrl: parsed.postingUrl,
        deadline: parsed.deadline,
        alwaysOpen: parsed.alwaysOpen,
        salaryNote: parsed.salaryNote,
        jobDescription: parsed.jobDescription,
        requiredQualifications: parsed.requiredQualifications,
        preferredQualifications: parsed.preferredQualifications,
        hiringProcess: parsed.hiringProcess,
        applicationMethod: parsed.applicationMethod,
        compensationDetail: parsed.compensationDetail,
    };
}

function ImportField({
    label,
    required,
    children,
}: {
    label: string;
    required?: boolean;
    children: ReactNode;
}) {
    return (
        <label className="block text-xs font-black text-slate-600">
            {label}
            {required ? ' *' : ''}
            <div className="mt-2">{children}</div>
        </label>
    );
}
