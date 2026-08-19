'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, profileApi } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useAdminPreviewStore } from '@/store/useAdminPreviewStore';
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';

const emptyProfileForm = {
    name: '',
    nameEn: '',
    jobTitle: '',
    bio: '',
    coreStackSummary: '',
    statusBadgeText: '',
    githubUrl: '',
    email: '',
    phone: '',
    publicEmail: false,
    publicPhone: false,
};

function toProfileForm(profile: Awaited<ReturnType<typeof profileApi.getPrivate>>) {
    return {
        name: profile.name,
        nameEn: profile.nameEn,
        jobTitle: profile.jobTitle,
        bio: profile.bio,
        coreStackSummary: profile.coreStackSummary,
        statusBadgeText: profile.statusBadgeText,
        githubUrl: profile.githubUrl,
        email: profile.email ?? '',
        phone: profile.phone ?? '',
        publicEmail: profile.publicEmail,
        publicPhone: profile.publicPhone,
    };
}

export function ProfileManagement({ workspaceSlug }: { workspaceSlug: string }) {
    const queryClient = useQueryClient();
    const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
    const [validationMessage, setValidationMessage] = useState('');

    const { data: privateProfile } = useQuery({
        queryKey: ['private-profile', workspaceSlug],
        queryFn: () => profileApi.getPrivate(workspaceSlug),
        retry: false,
    });

    const [editedProfileForm, setProfileForm] = useState<typeof emptyProfileForm | null>(null);
    const storedProfileForm = useMemo(
        () => (privateProfile ? toProfileForm(privateProfile) : emptyProfileForm),
        [privateProfile]
    );
    const profileForm = editedProfileForm ?? storedProfileForm;
    const profileBioRef = useRef<HTMLTextAreaElement>(null);
    const setPreviewProfileDraft = useAdminPreviewStore((s) => s.setProfileDraft);

    // 라이브 프리뷰 패널이 저장 전 초안을 메인페이지에 반영할 수 있도록 최신 폼 상태를 발행한다.
    useEffect(() => {
        setPreviewProfileDraft(profileForm);
        return () => setPreviewProfileDraft(null);
    }, [profileForm, setPreviewProfileDraft]);

    useLayoutEffect(() => {
        const textarea = profileBioRef.current;
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }, [profileForm.bio]);

    const updateProfileMutation = useMutation({
        mutationFn: (payload: typeof profileForm) => profileApi.update(workspaceSlug, payload),
        onSuccess: () => {
            setValidationMessage('');
            queryClient.invalidateQueries({ queryKey: ['private-profile', workspaceSlug] });
            alert('프로필 정보가 성공적으로 업데이트되었습니다!');
        },
        onError: (error: unknown) => {
            if (error instanceof ApiError && error.status === 401) {
                setUnauthenticated();
                return;
            }
            setValidationMessage('프로필을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
    });

    const handleProfileSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setValidationMessage('');
        updateProfileMutation.mutate(profileForm);
    };

    return (
        <div className="space-y-6">
            <AdminPageHeader
                eyebrow="Source Record"
                title="프로필 정보 관리"
                description="이력서 헤더 및 바이오 요약 영역의 원본 정보를 편집합니다."
            />

            <form
                onSubmit={handleProfileSubmit}
                onInvalid={(event) => {
                    const field = event.target as HTMLInputElement | HTMLTextAreaElement;
                    const fieldLabel = field.dataset.fieldLabel ?? '필수 항목';
                    setValidationMessage(`${fieldLabel} 항목을 확인해 주세요.`);
                }}
                className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                <p id="profile-required-help" className="text-xs font-semibold text-slate-500">
                    <span className="text-red-600" aria-hidden="true">
                        *
                    </span>{' '}
                    표시는 필수 입력입니다.
                </p>
                {validationMessage && (
                    <p
                        id="profile-validation-error"
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
                    >
                        {validationMessage}
                    </p>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="profile-name"
                            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400"
                        >
                            이름 (한글){' '}
                            <span className="text-red-600" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <input
                            id="profile-name"
                            type="text"
                            required
                            data-field-label="이름 (한글)"
                            aria-describedby="profile-required-help"
                            value={profileForm.name}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, name: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="profile-name-en"
                            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400"
                        >
                            이름 (영문){' '}
                            <span className="text-red-600" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <input
                            id="profile-name-en"
                            type="text"
                            required
                            data-field-label="이름 (영문)"
                            aria-describedby="profile-required-help"
                            value={profileForm.nameEn}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, nameEn: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="profile-job-title"
                            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400"
                        >
                            희망 직무 타이틀
                        </label>
                        <input
                            id="profile-job-title"
                            type="text"
                            data-field-label="희망 직무 타이틀"
                            value={profileForm.jobTitle}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, jobTitle: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="profile-status-badge"
                            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400"
                        >
                            활동 배지 상태 텍스트
                        </label>
                        <input
                            id="profile-status-badge"
                            type="text"
                            data-field-label="활동 배지 상태 텍스트"
                            value={profileForm.statusBadgeText}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, statusBadgeText: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>
                </div>

                <div>
                    <label
                        htmlFor="profile-bio"
                        className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400"
                    >
                        Bio (대표 소개 문장){' '}
                        <span className="text-red-600" aria-hidden="true">
                            *
                        </span>
                    </label>
                    <textarea
                        id="profile-bio"
                        ref={profileBioRef}
                        required
                        data-field-label="Bio (대표 소개 문장)"
                        aria-describedby="profile-required-help"
                        rows={3}
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        className="min-h-28 w-full resize-none overflow-hidden rounded-xl border border-slate-200 px-4 py-2.5 text-sm leading-relaxed transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="profile-career-duration"
                            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400"
                        >
                            총 경력 기간 (자동 계산)
                        </label>
                        <input
                            id="profile-career-duration"
                            type="text"
                            readOnly
                            value="경력 관리 기능 연결 예정"
                            title="Workspace별 경력 관리 API 전환 후 자동 계산됩니다."
                            className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="profile-core-stack"
                            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400"
                        >
                            핵심 기술 요약 문구 (예: Java / Node.js...)
                        </label>
                        <input
                            id="profile-core-stack"
                            type="text"
                            data-field-label="핵심 기술 요약 문구"
                            value={profileForm.coreStackSummary}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, coreStackSummary: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                        <label
                            htmlFor="profile-github-url"
                            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400"
                        >
                            GitHub 주소
                        </label>
                        <input
                            id="profile-github-url"
                            type="url"
                            data-field-label="GitHub 주소"
                            value={profileForm.githubUrl}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, githubUrl: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="profile-email"
                            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400"
                        >
                            이메일
                        </label>
                        <input
                            id="profile-email"
                            type="email"
                            data-field-label="이메일"
                            value={profileForm.email}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, email: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="profile-phone"
                            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400"
                        >
                            연락처
                        </label>
                        <input
                            id="profile-phone"
                            type="tel"
                            data-field-label="연락처"
                            pattern="0\d{1,2}-?\d{3,4}-?\d{4}"
                            title="숫자로만 입력하거나 010-1234-5678 형식으로 입력해 주세요."
                            value={profileForm.phone}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, phone: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-800">원본 프로필</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        이 화면은 원본 정보만 저장합니다. 이메일·전화번호를 포함한 공개 범위는 ‘공개
                        페이지 → 프로필 구성’에서 선택합니다.
                    </p>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
                    >
                        프로필 저장
                    </button>
                </div>
            </form>
        </div>
    );
}
