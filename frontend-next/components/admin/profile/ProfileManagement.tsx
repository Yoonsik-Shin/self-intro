'use client';

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, bffApi, profileApi } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useAdminPreviewStore } from '@/store/useAdminPreviewStore';

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
};

export function ProfileManagement() {
    const queryClient = useQueryClient();
    const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
    const handleMutationError = (error: unknown) => {
        if (error instanceof ApiError && error.status === 401) setUnauthenticated();
    };

    const { data: introData } = useQuery({
        queryKey: ['introduction'],
        queryFn: bffApi.getIntroduction,
    });

    const [profileForm, setProfileForm] = useState(emptyProfileForm);
    const profileBioRef = useRef<HTMLTextAreaElement>(null);
    const setProfileDraft = useAdminPreviewStore((s) => s.setProfileDraft);

    // 라이브 프리뷰 패널이 저장 전 초안을 메인페이지에 반영할 수 있도록 최신 폼 상태를 발행한다.
    useEffect(() => {
        setProfileDraft(profileForm);
        return () => setProfileDraft(null);
    }, [profileForm, setProfileDraft]);

    useEffect(() => {
        if (introData?.profile) {
            const p = introData.profile;
            setProfileForm({
                name: p.name,
                nameEn: p.nameEn,
                jobTitle: p.jobTitle,
                bio: p.bio,
                coreStackSummary: p.coreStackSummary,
                statusBadgeText: p.statusBadgeText,
                githubUrl: p.githubUrl,
                email: p.email,
                phone: p.phone,
            });
        }
    }, [introData]);

    useLayoutEffect(() => {
        const textarea = profileBioRef.current;
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }, [profileForm.bio]);

    const updateProfileMutation = useMutation({
        mutationFn: profileApi.update,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['introduction'] });
            alert('프로필 정보가 성공적으로 업데이트되었습니다!');
        },
        onError: handleMutationError,
    });

    const handleProfileSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        updateProfileMutation.mutate(profileForm);
    };

    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3">
                <h2 className="text-xl font-black text-slate-950">프로필 정보 관리</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                    이력서 헤더 및 바이오 요약 영역 정보를 실시간 편집합니다.
                </p>
            </div>

            <form
                onSubmit={handleProfileSubmit}
                className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            이름 (한글)
                        </label>
                        <input
                            type="text"
                            required
                            value={profileForm.name}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, name: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            이름 (영문)
                        </label>
                        <input
                            type="text"
                            required
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
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            희망 직무 타이틀
                        </label>
                        <input
                            type="text"
                            required
                            value={profileForm.jobTitle}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, jobTitle: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            활동 배지 상태 텍스트
                        </label>
                        <input
                            type="text"
                            required
                            value={profileForm.statusBadgeText}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, statusBadgeText: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>
                </div>

                <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Bio (대표 소개 문장)
                    </label>
                    <textarea
                        ref={profileBioRef}
                        required
                        rows={3}
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        className="min-h-28 w-full resize-none overflow-hidden rounded-xl border border-slate-200 px-4 py-2.5 text-sm leading-relaxed transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            총 경력 기간 (자동 계산)
                        </label>
                        <input
                            type="text"
                            readOnly
                            value={introData?.careerSummary ?? '경력 정보를 불러오는 중...'}
                            title="이력 및 경력 관리의 직장 경력 기간을 기준으로 자동 계산됩니다."
                            className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            핵심 기술 요약 문구 (예: Java / Node.js...)
                        </label>
                        <input
                            type="text"
                            required
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
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            GitHub 주소
                        </label>
                        <input
                            type="url"
                            required
                            value={profileForm.githubUrl}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, githubUrl: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            이메일
                        </label>
                        <input
                            type="email"
                            required
                            value={profileForm.email}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, email: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            연락처
                        </label>
                        <input
                            type="text"
                            required
                            value={profileForm.phone}
                            onChange={(e) =>
                                setProfileForm({ ...profileForm, phone: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>
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
