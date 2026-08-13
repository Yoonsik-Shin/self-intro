'use client';

import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Check, Database, RefreshCw, ShieldCheck } from 'lucide-react';
import { ApiError, authApi, vectorOperationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export function VectorReconciliationPanel() {
    const setUnauthenticated = useAuthStore((state) => state.setUnauthenticated);
    const [repairConfirmed, setRepairConfirmed] = useState(false);
    const [repairPending, setRepairPending] = useState(false);
    const [repairMessage, setRepairMessage] = useState<string | null>(null);
    const [repairError, setRepairError] = useState<string | null>(null);
    const [missingConfirmed, setMissingConfirmed] = useState(false);
    const [missingPending, setMissingPending] = useState(false);
    const [password, setPassword] = useState('');
    const [reauthenticated, setReauthenticated] = useState(false);
    const inspection = useQuery({
        queryKey: ['ops', 'vector-reconciliation'],
        queryFn: vectorOperationsApi.inspectReconciliation,
        enabled: false,
        retry: false,
    });

    const result = inspection.data;
    const inconsistencyCount = result
        ? result.orphanExperienceNamespaces +
          result.missingExperienceNamespaces +
          result.orphanStudyNamespaces +
          result.missingStudyNamespaces
        : 0;
    const isConsistent = Boolean(result) && inconsistencyCount === 0;
    const errorMessage = inspection.error
        ? inspection.error instanceof ApiError && inspection.error.status === 403
            ? '플랫폼 운영자만 Vector 정합성을 점검할 수 있습니다.'
            : inspection.error instanceof Error
              ? inspection.error.message
              : 'Vector 정합성 점검을 완료하지 못했습니다.'
        : null;

    async function reauthenticate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setRepairError(null);
        let activeSessionConfirmed = false;
        try {
            await authApi.me();
            activeSessionConfirmed = true;
            await authApi.reauthenticate(password);
            setReauthenticated(true);
        } catch (cause) {
            setReauthenticated(false);
            if (cause instanceof ApiError && cause.status === 401 && !activeSessionConfirmed) {
                setRepairError('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
                setUnauthenticated();
            } else {
                setRepairError('운영자 비밀번호를 다시 확인해 주세요.');
            }
        } finally {
            setPassword('');
        }
    }

    async function reconcileOrphans() {
        if (!repairConfirmed || !reauthenticated) return;
        setRepairPending(true);
        setRepairMessage(null);
        setRepairError(null);
        try {
            const repaired = await vectorOperationsApi.reconcileOrphans();
            setRepairMessage(
                `Experience ${repaired.deletedExperienceNamespaces.toLocaleString()}개 namespace·${repaired.deletedExperienceChunks.toLocaleString()}개 chunk, Study ${repaired.deletedStudyNamespaces.toLocaleString()}개 namespace·${repaired.deletedStudyChunks.toLocaleString()}개 chunk를 삭제했습니다.`
            );
            setRepairConfirmed(false);
            await inspection.refetch();
        } catch (cause) {
            if (cause instanceof ApiError && cause.status === 401) {
                setReauthenticated(false);
                setRepairError(
                    '최근 비밀번호 재확인이 만료되었습니다. 비밀번호를 다시 확인해 주세요.'
                );
            } else {
                setRepairError(
                    cause instanceof Error
                        ? cause.message
                        : '고아 Vector 삭제를 완료하지 못했습니다.'
                );
            }
        } finally {
            setRepairPending(false);
        }
    }

    async function repairMissingExternal() {
        if (!missingConfirmed || !reauthenticated) return;
        setMissingPending(true);
        setRepairMessage(null);
        setRepairError(null);
        try {
            const repaired = await vectorOperationsApi.repairMissingWithExternalProvider();
            setRepairMessage(
                `누락 Experience ${repaired.repairedExperienceNamespaces.toLocaleString()}개 namespace·${repaired.createdExperienceChunks.toLocaleString()}개 chunk, Study ${repaired.repairedStudyNamespaces.toLocaleString()}개 namespace·${repaired.createdStudyChunks.toLocaleString()}개 chunk를 외부 임베딩으로 생성했습니다.`
            );
            setMissingConfirmed(false);
            await inspection.refetch();
        } catch (cause) {
            if (cause instanceof ApiError && cause.status === 401) {
                setReauthenticated(false);
                setRepairError(
                    '최근 비밀번호 재확인이 만료되었습니다. 비밀번호를 다시 확인해 주세요.'
                );
            } else {
                setRepairError(
                    cause instanceof Error
                        ? cause.message
                        : '누락 Vector 생성을 완료하지 못했습니다.'
                );
            }
        } finally {
            setMissingPending(false);
        }
    }

    return (
        <div className="space-y-6 text-slate-800">
            <header>
                <span className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
                    Platform Operations
                </span>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                    Vector 정합성 점검
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    MySQL 원본과 Oracle Vector의 Experience·Study namespace 수를 읽기 전용으로
                    대조합니다. 이 화면은 ID·제목·본문을 표시하지 않으며 명시적으로 확인한 고아 파생
                    Vector만 정리할 수 있습니다. 전체 백필은 실행하지 않습니다.
                </p>
            </header>

            <section className="flex flex-col gap-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-2 font-black text-indigo-950">
                        <ShieldCheck className="h-5 w-5" /> Read-only reconciliation
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-900/80">
                        점검은 명시적으로 버튼을 누를 때만 실행됩니다. 고아 namespace가 발견돼도
                        자동으로 수정하지 않으며, 별도 검토 전에는 백필을 실행하지 않습니다.
                    </p>
                </div>
                <button
                    type="button"
                    disabled={inspection.isFetching}
                    onClick={() => void inspection.refetch()}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-indigo-600 disabled:opacity-50"
                >
                    <RefreshCw
                        className={`h-4 w-4 ${inspection.isFetching ? 'animate-spin' : ''}`}
                    />
                    {inspection.isFetching
                        ? '대조 중...'
                        : result
                          ? '다시 점검'
                          : '정합성 점검 실행'}
                </button>
            </section>

            {errorMessage && (
                <p
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
                >
                    {errorMessage}
                </p>
            )}

            {!result && !errorMessage && (
                <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <Database className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-500">
                        아직 정합성 점검을 실행하지 않았습니다.
                    </p>
                </section>
            )}

            {result && (
                <>
                    <section
                        className={`flex items-start gap-3 rounded-2xl border p-5 ${
                            isConsistent
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                                : 'border-amber-200 bg-amber-50 text-amber-950'
                        }`}
                    >
                        {isConsistent ? (
                            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                        ) : (
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                        )}
                        <div>
                            <h2 className="font-black">
                                {isConsistent
                                    ? '원본과 Vector namespace가 일치합니다.'
                                    : `불일치 namespace ${inconsistencyCount.toLocaleString()}개를 확인했습니다.`}
                            </h2>
                            <p className="mt-1 text-sm leading-6 opacity-80">
                                {isConsistent
                                    ? '현재 읽기 전용 대조에서는 별도 조치가 필요하지 않습니다.'
                                    : '이 화면에서는 데이터를 변경하지 않습니다. 원인과 Worker 로그를 검토한 뒤 별도 절차로 처리하세요.'}
                            </p>
                        </div>
                    </section>

                    <section className="grid gap-4 md:grid-cols-2">
                        <NamespaceCard
                            title="Experience Vector"
                            source={result.sourceExperienceNamespaces}
                            vector={result.scannedExperienceNamespaces}
                            orphan={result.orphanExperienceNamespaces}
                            missing={result.missingExperienceNamespaces}
                        />
                        <NamespaceCard
                            title="Study Vector"
                            source={result.sourceStudyNamespaces}
                            vector={result.scannedStudyNamespaces}
                            orphan={result.orphanStudyNamespaces}
                            missing={result.missingStudyNamespaces}
                        />
                    </section>
                </>
            )}

            {result && inconsistencyCount > 0 && (
                <section className="space-y-3 rounded-2xl border border-slate-300 bg-white p-5">
                    <div>
                        <h2 className="font-black text-slate-950">중요 작업 재인증</h2>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                            Vector 삭제 또는 외부 임베딩 전송 전 최근 10분 이내 비밀번호 재확인이
                            필요합니다.
                        </p>
                    </div>
                    <form
                        onSubmit={reauthenticate}
                        className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]"
                    >
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="운영자 비밀번호 재확인"
                            autoComplete="current-password"
                            required
                            className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-600"
                        />
                        <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white"
                        >
                            {reauthenticated ? <Check className="h-4 w-4" /> : '재확인'}
                        </button>
                    </form>
                </section>
            )}

            {result &&
                (result.orphanExperienceNamespaces > 0 || result.orphanStudyNamespaces > 0) && (
                    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm">
                        <div>
                            <h2 className="font-black text-white">고아 Vector 정리</h2>
                            <p className="mt-1 text-sm leading-6 text-slate-300">
                                MySQL 원본이 없는 파생 Vector만 삭제합니다. 원본 데이터와 현재
                                원본에 연결된 Vector는 변경하지 않으며 외부 임베딩 API를 호출하지
                                않습니다.
                            </p>
                        </div>
                        <label className="flex items-start gap-3 text-sm font-bold text-slate-100">
                            <input
                                type="checkbox"
                                checked={repairConfirmed}
                                onChange={(event) => setRepairConfirmed(event.target.checked)}
                                className="mt-1"
                            />
                            고아 Experience {result.orphanExperienceNamespaces.toLocaleString()}개와
                            Study {result.orphanStudyNamespaces.toLocaleString()}개 namespace가
                            삭제됨을 확인했습니다.
                        </label>
                        <button
                            type="button"
                            disabled={!repairConfirmed || !reauthenticated || repairPending}
                            onClick={() => void reconcileOrphans()}
                            className="rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100 disabled:opacity-40"
                        >
                            {repairPending ? '고아 Vector 정리 중...' : '고아 Vector만 삭제'}
                        </button>
                    </section>
                )}

            {result &&
                (result.missingExperienceNamespaces > 0 || result.missingStudyNamespaces > 0) && (
                    <section className="space-y-4 rounded-2xl border border-rose-300 bg-rose-50 p-5">
                        <div>
                            <h2 className="font-black text-rose-950">
                                누락 Vector 외부 임베딩 복구
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-rose-900/80">
                                누락된 원본의 제목과 본문 청크를 NVIDIA embedding API로 전송해
                                Vector를 생성합니다. 전체 원본은 재처리하지 않으며 provider 실패를
                                로컬 임의 벡터로 숨기지 않습니다.
                            </p>
                        </div>
                        <label className="flex items-start gap-3 text-sm font-bold text-rose-950">
                            <input
                                type="checkbox"
                                checked={missingConfirmed}
                                onChange={(event) => setMissingConfirmed(event.target.checked)}
                                className="mt-1"
                            />
                            누락 Experience {result.missingExperienceNamespaces.toLocaleString()}
                            개와 Study {result.missingStudyNamespaces.toLocaleString()}개의
                            제목·본문 청크가 외부 NVIDIA API로 전송됨을 확인했습니다.
                        </label>
                        <button
                            type="button"
                            disabled={!missingConfirmed || !reauthenticated || missingPending}
                            onClick={() => void repairMissingExternal()}
                            className="rounded-xl bg-rose-900 px-5 py-3 text-sm font-black text-white disabled:opacity-40"
                        >
                            {missingPending
                                ? '누락 Vector 생성 중...'
                                : '누락 Vector를 외부 임베딩으로 생성'}
                        </button>
                    </section>
                )}

            {(repairMessage || repairError) && (
                <p
                    role="status"
                    className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                        repairError
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                >
                    {repairError ?? repairMessage}
                </p>
            )}
        </div>
    );
}

function NamespaceCard({
    title,
    source,
    vector,
    orphan,
    missing,
}: {
    title: string;
    source: number;
    vector: number;
    orphan: number;
    missing: number;
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <h3 className="font-black text-slate-950">{title}</h3>
                <span
                    className={`rounded-full px-2.5 py-1 text-xs font-black ${
                        orphan === 0 && missing === 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                    }`}
                >
                    {orphan === 0 && missing === 0 ? '정상' : '검토 필요'}
                </span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-4">
                    <dt className="text-xs font-bold text-slate-500">MySQL 원본</dt>
                    <dd className="mt-1 text-2xl font-black text-slate-950">
                        {source.toLocaleString()}
                    </dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                    <dt className="text-xs font-bold text-slate-500">Vector namespace</dt>
                    <dd className="mt-1 text-2xl font-black text-slate-950">
                        {vector.toLocaleString()}
                    </dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                    <dt className="text-xs font-bold text-slate-500">고아 namespace</dt>
                    <dd className="mt-1 text-2xl font-black text-slate-950">
                        {orphan.toLocaleString()}
                    </dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                    <dt className="text-xs font-bold text-slate-500">누락 namespace</dt>
                    <dd className="mt-1 text-2xl font-black text-slate-950">
                        {missing.toLocaleString()}
                    </dd>
                </div>
            </dl>
        </article>
    );
}
