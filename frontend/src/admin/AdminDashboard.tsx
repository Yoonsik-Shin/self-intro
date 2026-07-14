import { useState, type FormEvent, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Home,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  BookOpen,
  User,
  Cpu,
  Briefcase,
  PlusCircle,
  MinusCircle
} from 'lucide-react';
import {
  ApiError,
  studyApi,
  profileApi,
  skillApi,
  experienceApi,
  bffApi,
  type CreateStudyEntryRequest,
  type StudyEntry,
  type Skill,
  type Experience,
  type ExperienceRequest
} from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

type TabId = 'STUDY' | 'PROFILE' | 'SKILLS' | 'EXPERIENCE';

const emptyStudyForm: CreateStudyEntryRequest = {
  title: '',
  description: '',
  category: 'PROJECT',
  skills: '',
  takeaway: '',
  learnedAt: new Date().toISOString().split('T')[0],
};

const emptyProfileForm = {
  name: '',
  nameEn: '',
  jobTitle: '',
  bio: '',
  careerSummary: '',
  coreStackSummary: '',
  statusBadgeText: '',
  githubUrl: '',
  email: '',
  phone: '',
};

const emptySkillForm = {
  name: '',
  category: 'FRAMEWORK',
  skillLevel: '중급',
  isCore: false,
  displayOrder: 0,
};

const emptyExperienceForm = {
  type: 'PROJECT' as ExperienceRequest['type'],
  title: '',
  periodStart: new Date().toISOString().split('T')[0],
  periodEnd: '',
  summary: '',
  takeaway: '',
  essayContent: '',
  displayOrder: 0,
  details: [] as string[],
  skillIds: [] as number[],
  companyName: '',
  employmentType: '정규직',
  department: '',
  role: '',
  slug: '',
  contributionRate: 100,
  institutionName: '',
  issuer: '',
};

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);

  const [activeTab, setActiveTab] = useState<TabId>('STUDY');

  // Unified API error handler for security expiration
  const handleMutationError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      setUnauthenticated();
    }
  };

  // --- QUERY HOOKS ---
  const { data: studyEntries } = useQuery<StudyEntry[]>({
    queryKey: ['studyEntries'],
    queryFn: () => studyApi.list(),
  });

  const { data: introData } = useQuery({
    queryKey: ['introduction'],
    queryFn: bffApi.getIntroduction,
  });

  const { data: skillsList } = useQuery<Skill[]>({
    queryKey: ['skills'],
    queryFn: () => skillApi.list(),
  });

  const { data: experiencesList } = useQuery<Experience[]>({
    queryKey: ['experiences'],
    queryFn: () => experienceApi.list(),
  });

  // --- TAB 1: STUDY ENTRY STATE & MUTATIONS ---
  const [studyEditingId, setStudyEditingId] = useState<number | null>(null);
  const [studyForm, setStudyForm] = useState<CreateStudyEntryRequest>(emptyStudyForm);
  const [isStudyFormOpen, setIsStudyFormOpen] = useState(false);

  const createStudyMutation = useMutation({
    mutationFn: studyApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning'] });
      queryClient.invalidateQueries({ queryKey: ['studyEntries'] });
      setStudyForm(emptyStudyForm);
      setIsStudyFormOpen(false);
    },
    onError: handleMutationError,
  });

  const updateStudyMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CreateStudyEntryRequest }) =>
      studyApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning'] });
      queryClient.invalidateQueries({ queryKey: ['studyEntries'] });
      setStudyEditingId(null);
      setStudyForm(emptyStudyForm);
      setIsStudyFormOpen(false);
    },
    onError: handleMutationError,
  });

  const deleteStudyMutation = useMutation({
    mutationFn: studyApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning'] });
      queryClient.invalidateQueries({ queryKey: ['studyEntries'] });
    },
    onError: handleMutationError,
  });

  const handleStudySubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (studyEditingId !== null) {
      updateStudyMutation.mutate({ id: studyEditingId, payload: studyForm });
    } else {
      createStudyMutation.mutate(studyForm);
    }
  };

  const handleStudyDelete = (id: number) => {
    if (window.confirm('정말 이 공부 기록을 삭제하시겠습니까?')) {
      deleteStudyMutation.mutate(id);
    }
  };

  // --- TAB 2: PROFILE STATE & MUTATIONS ---
  const [profileForm, setProfileForm] = useState(emptyProfileForm);

  useEffect(() => {
    if (introData?.profile) {
      const p = introData.profile;
      setProfileForm({
        name: p.name,
        nameEn: p.nameEn,
        jobTitle: p.jobTitle,
        bio: p.bio,
        careerSummary: p.careerSummary,
        coreStackSummary: p.coreStackSummary,
        statusBadgeText: p.statusBadgeText,
        githubUrl: p.githubUrl,
        email: p.email,
        phone: p.phone,
      });
    }
  }, [introData]);

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

  // --- TAB 3: SKILLS STATE & MUTATIONS ---
  const [skillEditingId, setSkillEditingId] = useState<number | null>(null);
  const [skillForm, setSkillForm] = useState(emptySkillForm);
  const [isSkillFormOpen, setIsSkillFormOpen] = useState(false);

  const createSkillMutation = useMutation({
    mutationFn: skillApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['introduction'] });
      setSkillForm(emptySkillForm);
      setIsSkillFormOpen(false);
    },
    onError: handleMutationError,
  });

  const updateSkillMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: typeof emptySkillForm }) =>
      skillApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['introduction'] });
      setSkillEditingId(null);
      setSkillForm(emptySkillForm);
      setIsSkillFormOpen(false);
    },
    onError: handleMutationError,
  });

  const deleteSkillMutation = useMutation({
    mutationFn: skillApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['introduction'] });
    },
    onError: handleMutationError,
  });

  const handleSkillSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (skillEditingId !== null) {
      updateSkillMutation.mutate({ id: skillEditingId, payload: skillForm });
    } else {
      createSkillMutation.mutate(skillForm);
    }
  };

  const handleSkillDelete = (id: number) => {
    if (window.confirm('정말 이 기술 스택을 삭제하시겠습니까?')) {
      deleteSkillMutation.mutate(id);
    }
  };

  // --- TAB 4: EXPERIENCE STATE & MUTATIONS ---
  const [expEditingId, setExpEditingId] = useState<number | null>(null);
  const [expForm, setExpForm] = useState(emptyExperienceForm);
  const [isExpFormOpen, setIsExpFormOpen] = useState(false);
  const [detailInput, setDetailInput] = useState('');

  const createExpMutation = useMutation({
    mutationFn: experienceApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      queryClient.invalidateQueries({ queryKey: ['introduction'] });
      setExpForm(emptyExperienceForm);
      setIsExpFormOpen(false);
    },
    onError: handleMutationError,
  });

  const updateExpMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ExperienceRequest }) =>
      experienceApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      queryClient.invalidateQueries({ queryKey: ['introduction'] });
      setExpEditingId(null);
      setExpForm(emptyExperienceForm);
      setIsExpFormOpen(false);
    },
    onError: handleMutationError,
  });

  const deleteExpMutation = useMutation({
    mutationFn: experienceApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      queryClient.invalidateQueries({ queryKey: ['introduction'] });
    },
    onError: handleMutationError,
  });

  const handleExpSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload: ExperienceRequest = {
      type: expForm.type,
      title: expForm.title,
      periodStart: expForm.periodStart,
      periodEnd: expForm.periodEnd ? expForm.periodEnd : null,
      summary: expForm.summary,
      takeaway: expForm.takeaway,
      essayContent: expForm.essayContent,
      displayOrder: Number(expForm.displayOrder),
      details: expForm.details,
      skillIds: expForm.skillIds,
      companyName: expForm.type === 'CAREER' ? expForm.companyName : undefined,
      employmentType: expForm.type === 'CAREER' ? expForm.employmentType : undefined,
      department: expForm.type === 'CAREER' ? expForm.department : undefined,
      role: (expForm.type === 'CAREER' || expForm.type === 'PROJECT') ? expForm.role : undefined,
      slug: expForm.type === 'PROJECT' ? expForm.slug : undefined,
      contributionRate: expForm.type === 'PROJECT' ? Number(expForm.contributionRate) : undefined,
      institutionName: expForm.type === 'EDUCATION' ? expForm.institutionName : undefined,
      issuer: expForm.type === 'CERTIFICATE' ? expForm.issuer : undefined,
    };

    if (expEditingId !== null) {
      updateExpMutation.mutate({ id: expEditingId, payload });
    } else {
      createExpMutation.mutate(payload);
    }
  };

  const handleExpDelete = (id: number) => {
    if (window.confirm('정말 이 이력 항목을 삭제하시겠습니까?')) {
      deleteExpMutation.mutate(id);
    }
  };

  const addDetailPoint = () => {
    if (detailInput.trim()) {
      setExpForm({
        ...expForm,
        details: [...expForm.details, detailInput.trim()],
      });
      setDetailInput('');
    }
  };

  const removeDetailPoint = (idx: number) => {
    setExpForm({
      ...expForm,
      details: expForm.details.filter((_, i) => i !== idx),
    });
  };

  const toggleExpSkill = (skillId: number) => {
    const isChecked = expForm.skillIds.includes(skillId);
    setExpForm({
      ...expForm,
      skillIds: isChecked
        ? expForm.skillIds.filter((id) => id !== skillId)
        : [...expForm.skillIds, skillId],
    });
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-800">
      {/* HEADER */}
      <header className="sticky top-0 z-25 flex items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-black text-slate-900">관리자 대시보드</h1>
          <span className="text-xs font-bold text-slate-405">v1.5</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            <Home className="h-3.5 w-3.5" />
            메인페이지
          </a>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            <LogOut className="h-3.5 w-3.5" />
            로그아웃
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* SIDE BAR NAVIGATION */}
        <aside className="space-y-1.5">
          <p className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">메뉴 목록</p>
          <button
            onClick={() => { setActiveTab('STUDY'); setIsStudyFormOpen(false); }}
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-bold text-left transition ${
              activeTab === 'STUDY'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/10'
                : 'text-slate-600 hover:bg-slate-105 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            공부 정리 관리
          </button>
          <button
            onClick={() => { setActiveTab('PROFILE'); }}
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-bold text-left transition ${
              activeTab === 'PROFILE'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/10'
                : 'text-slate-600 hover:bg-slate-105 hover:text-slate-900'
            }`}
          >
            <User className="h-4 w-4" />
            프로필 정보 관리
          </button>
          <button
            onClick={() => { setActiveTab('SKILLS'); setIsSkillFormOpen(false); }}
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-bold text-left transition ${
              activeTab === 'SKILLS'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/10'
                : 'text-slate-600 hover:bg-slate-105 hover:text-slate-900'
            }`}
          >
            <Cpu className="h-4 w-4" />
            기술 스택 관리
          </button>
          <button
            onClick={() => { setActiveTab('EXPERIENCE'); setIsExpFormOpen(false); }}
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-bold text-left transition ${
              activeTab === 'EXPERIENCE'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/10'
                : 'text-slate-600 hover:bg-slate-105 hover:text-slate-900'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            이력 및 경력 관리
          </button>
        </aside>

        {/* MAIN PANEL CONTENT */}
        <section className="col-span-1 md:col-span-3 space-y-6">
          {/* ======================= STUDY TAB ======================= */}
          {activeTab === 'STUDY' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950">공부 정리 관리</h2>
                  <p className="text-xs text-slate-500 mt-0.5">공부 정리(StudyEntry) 목록을 수정하거나 추가합니다.</p>
                </div>
                <button
                  onClick={() => {
                    setStudyEditingId(null);
                    setStudyForm(emptyStudyForm);
                    setIsStudyFormOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-500"
                >
                  <Plus className="h-4 w-4" />
                  새 글 작성
                </button>
              </div>

              {isStudyFormOpen && (
                <form onSubmit={handleStudySubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800">{studyEditingId !== null ? '글 수정' : '새 글 작성'}</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">제목</label>
                      <input
                        type="text"
                        required
                        value={studyForm.title}
                        onChange={(e) => setStudyForm({ ...studyForm, title: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">분류</label>
                      <select
                        value={studyForm.category}
                        onChange={(e) =>
                          setStudyForm({ ...studyForm, category: e.target.value as CreateStudyEntryRequest['category'] })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="PROJECT">프로젝트 (PROJECT)</option>
                        <option value="EDUCATION">공부/학습 (STUDY)</option>
                        <option value="CERTIFICATE">자격증 (CERTIFICATE)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">기술 스택 (쉼표 구분)</label>
                    <input
                      type="text"
                      value={studyForm.skills}
                      onChange={(e) => setStudyForm({ ...studyForm, skills: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-455">상세 설명</label>
                    <textarea
                      required
                      rows={5}
                      value={studyForm.description}
                      onChange={(e) => setStudyForm({ ...studyForm, description: e.target.value })}
                      className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-455">핵심 Lesson Learned / Takeaway</label>
                    <textarea
                      required
                      rows={3}
                      value={studyForm.takeaway}
                      onChange={(e) => setStudyForm({ ...studyForm, takeaway: e.target.value })}
                      className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">학습일</label>
                    <input
                      type="date"
                      required
                      value={studyForm.learnedAt}
                      onChange={(e) => setStudyForm({ ...studyForm, learnedAt: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsStudyFormOpen(false)}
                      className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={createStudyMutation.isPending || updateStudyMutation.isPending}
                      className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {studyEditingId !== null ? '수정 완료' : '작성 완료'}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2.5">
                {studyEntries?.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-slate-400">
                        {entry.learnedAt} · {entry.category}
                      </p>
                      <p className="truncate text-sm font-black text-slate-800">{entry.title}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => {
                          setStudyEditingId(entry.id);
                          setStudyForm({
                            title: entry.title,
                            description: entry.description,
                            category: entry.category,
                            skills: entry.skills.join(', '),
                            takeaway: entry.takeaway,
                            learnedAt: entry.learnedAt,
                          });
                          setIsStudyFormOpen(true);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-indigo-200 hover:text-indigo-650"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleStudyDelete(entry.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================= PROFILE TAB ======================= */}
          {activeTab === 'PROFILE' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-black text-slate-950">프로필 정보 관리</h2>
                <p className="text-xs text-slate-500 mt-0.5">이력서 헤더 및 바이오 요약 영역 정보를 실시간 편집합니다.</p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">이름 (한글)</label>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">이름 (영문)</label>
                    <input
                      type="text"
                      required
                      value={profileForm.nameEn}
                      onChange={(e) => setProfileForm({ ...profileForm, nameEn: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">희망 직무 타이틀</label>
                    <input
                      type="text"
                      required
                      value={profileForm.jobTitle}
                      onChange={(e) => setProfileForm({ ...profileForm, jobTitle: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">활동 배지 상태 텍스트</label>
                    <input
                      type="text"
                      required
                      value={profileForm.statusBadgeText}
                      onChange={(e) => setProfileForm({ ...profileForm, statusBadgeText: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-455">Bio (대표 소개 문장)</label>
                  <textarea
                    required
                    rows={3}
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">경력 요약 문구 (예: 1년 11개월...)</label>
                    <input
                      type="text"
                      required
                      value={profileForm.careerSummary}
                      onChange={(e) => setProfileForm({ ...profileForm, careerSummary: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">핵심 기술 요약 문구 (예: Java / Node.js...)</label>
                    <input
                      type="text"
                      required
                      value={profileForm.coreStackSummary}
                      onChange={(e) => setProfileForm({ ...profileForm, coreStackSummary: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">GitHub 주소</label>
                    <input
                      type="url"
                      required
                      value={profileForm.githubUrl}
                      onChange={(e) => setProfileForm({ ...profileForm, githubUrl: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">이메일</label>
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">연락처</label>
                    <input
                      type="text"
                      required
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50"
                  >
                    프로필 저장
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ======================= SKILLS TAB ======================= */}
          {activeTab === 'SKILLS' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950">기술 스택 관리</h2>
                  <p className="text-xs text-slate-500 mt-0.5">포트폴리오 핵심/일반 마스터 기술 목록을 관리합니다.</p>
                </div>
                <button
                  onClick={() => {
                    setSkillEditingId(null);
                    setSkillForm(emptySkillForm);
                    setIsSkillFormOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-500"
                >
                  <Plus className="h-4 w-4" />
                  새 기술 추가
                </button>
              </div>

              {isSkillFormOpen && (
                <form onSubmit={handleSkillSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800">{skillEditingId !== null ? '기술 수정' : '새 기술 추가'}</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">기술 스택명</label>
                      <input
                        type="text"
                        required
                        placeholder="예: Java, React"
                        value={skillForm.name}
                        onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-550 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">분류 카테고리</label>
                      <select
                        value={skillForm.category}
                        onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="LANGUAGE">개발 언어 (LANGUAGE)</option>
                        <option value="FRAMEWORK">프레임워크 / 라이브러리 (FRAMEWORK)</option>
                        <option value="DATABASE">데이터베이스 (DATABASE)</option>
                        <option value="DEVOPS">배포 및 인프라 (DEVOPS)</option>
                        <option value="AI_RAG">인공지능 / RAG (AI_RAG)</option>
                        <option value="ETC">기타 (ETC)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">기술 레벨</label>
                      <input
                        type="text"
                        value={skillForm.skillLevel}
                        placeholder="예: 중급, 고급, 상"
                        onChange={(e) => setSkillForm({ ...skillForm, skillLevel: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">정렬 순서</label>
                      <input
                        type="number"
                        required
                        value={skillForm.displayOrder}
                        onChange={(e) => setSkillForm({ ...skillForm, displayOrder: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={skillForm.isCore}
                          onChange={(e) => setSkillForm({ ...skillForm, isCore: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-slate-600 uppercase">핵심기술로 표시</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsSkillFormOpen(false)}
                      className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={createSkillMutation.isPending || updateSkillMutation.isPending}
                      className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {skillEditingId !== null ? '수정 완료' : '추가 완료'}
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {skillsList?.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
                  >
                    <div>
                      <p className="font-mono text-[10px] font-bold text-slate-400">
                        {skill.category} {skill.skillLevel ? `· ${skill.skillLevel}` : ''}
                      </p>
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                        {skill.name}
                        {skill.isCore && (
                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 border border-indigo-100">Core</span>
                        )}
                      </h4>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => {
                          setSkillEditingId(skill.id);
                          setSkillForm({
                            name: skill.name,
                            category: skill.category,
                            skillLevel: skill.skillLevel ?? '',
                            isCore: skill.isCore,
                            displayOrder: skill.displayOrder,
                          });
                          setIsSkillFormOpen(true);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-indigo-200 hover:text-indigo-650"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleSkillDelete(skill.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:text-red-650"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================= EXPERIENCE TAB ======================= */}
          {activeTab === 'EXPERIENCE' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950">이력 및 경력 관리</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Career, Project, Education, Certificate 항목을 유형별로 관리합니다.</p>
                </div>
                <button
                  onClick={() => {
                    setExpEditingId(null);
                    setExpForm(emptyExperienceForm);
                    setIsExpFormOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-500"
                >
                  <Plus className="h-4 w-4" />
                  이력 추가
                </button>
              </div>

              {isExpFormOpen && (
                <form onSubmit={handleExpSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800">{expEditingId !== null ? '이력 수정' : '새 이력 추가'}</h3>
                  
                  {/* Common: Type, Title, displayOrder */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">이력 구분 (유형)</label>
                      <select
                        value={expForm.type}
                        onChange={(e) => setExpForm({ ...expForm, type: e.target.value as any })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="CAREER">회사 경력 (CAREER)</option>
                        <option value="PROJECT">프로젝트 (PROJECT)</option>
                        <option value="EDUCATION">학력/학습 (EDUCATION)</option>
                        <option value="CERTIFICATE">자격증 (CERTIFICATE)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">이력명 (타이틀)</label>
                      <input
                        type="text"
                        required
                        value={expForm.title}
                        onChange={(e) => setExpForm({ ...expForm, title: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>

                  {/* Common: Period, displayOrder */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">시작일</label>
                      <input
                        type="date"
                        required
                        value={expForm.periodStart}
                        onChange={(e) => setExpForm({ ...expForm, periodStart: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">종료일 (없으면 비워둠)</label>
                      <input
                        type="date"
                        value={expForm.periodEnd}
                        onChange={(e) => setExpForm({ ...expForm, periodEnd: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">정렬 순서</label>
                      <input
                        type="number"
                        required
                        value={expForm.displayOrder}
                        onChange={(e) => setExpForm({ ...expForm, displayOrder: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>

                  {/* Subtype Conditional Fields */}
                  {expForm.type === 'CAREER' && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 rounded-xl bg-indigo-50/20 border border-indigo-100/50 p-4">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">회사명</label>
                        <input
                          type="text"
                          required
                          value={expForm.companyName}
                          onChange={(e) => setExpForm({ ...expForm, companyName: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">고용 형태</label>
                        <input
                          type="text"
                          required
                          value={expForm.employmentType}
                          onChange={(e) => setExpForm({ ...expForm, employmentType: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">부서명</label>
                        <input
                          type="text"
                          required
                          value={expForm.department}
                          onChange={(e) => setExpForm({ ...expForm, department: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">담당 직무 (역할)</label>
                        <input
                          type="text"
                          required
                          value={expForm.role}
                          onChange={(e) => setExpForm({ ...expForm, role: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {expForm.type === 'PROJECT' && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-xl bg-indigo-50/20 border border-indigo-100/50 p-4">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">프로젝트 식별자 (slug)</label>
                        <input
                          type="text"
                          required
                          placeholder="예: project1, project2"
                          value={expForm.slug}
                          onChange={(e) => setExpForm({ ...expForm, slug: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">담당 직무 (역할)</label>
                        <input
                          type="text"
                          required
                          placeholder="예: Backend & DevOps"
                          value={expForm.role}
                          onChange={(e) => setExpForm({ ...expForm, role: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">기여도 (%)</label>
                        <input
                          type="number"
                          required
                          min={0}
                          max={100}
                          value={expForm.contributionRate}
                          onChange={(e) => setExpForm({ ...expForm, contributionRate: Number(e.target.value) })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {expForm.type === 'EDUCATION' && (
                    <div className="rounded-xl bg-indigo-50/20 border border-indigo-100/50 p-4">
                      <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">학교 또는 교육 기관명</label>
                      <input
                        type="text"
                        required
                        placeholder="예: OO대학교 컴퓨터공학"
                        value={expForm.institutionName}
                        onChange={(e) => setExpForm({ ...expForm, institutionName: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {expForm.type === 'CERTIFICATE' && (
                    <div className="rounded-xl bg-indigo-50/20 border border-indigo-100/50 p-4">
                      <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">발급 기관</label>
                      <input
                        type="text"
                        required
                        placeholder="예: 한국산업인력공단"
                        value={expForm.issuer}
                        onChange={(e) => setExpForm({ ...expForm, issuer: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Common Text Areas */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">한줄 요약 (Summary)</label>
                    <input
                      type="text"
                      value={expForm.summary}
                      onChange={(e) => setExpForm({ ...expForm, summary: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">Takeaway (성과 및 배운점)</label>
                    <textarea
                      rows={2}
                      value={expForm.takeaway}
                      onChange={(e) => setExpForm({ ...expForm, takeaway: e.target.value })}
                      className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">역량 기술서 본문 내용 (Essay Content - Optional)</label>
                    <textarea
                      rows={5}
                      placeholder="역량 기술서 화면에 표시될 서술형 줄글 수필 내용을 작성합니다."
                      value={expForm.essayContent}
                      onChange={(e) => setExpForm({ ...expForm, essayContent: e.target.value })}
                      className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  {/* Dynamic Details List (Bullet Points) */}
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-405">이력 상세 항목 (Bullet Points)</label>
                    
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="새로운 불릿 항목 상세 입력..."
                        value={detailInput}
                        onChange={(e) => setDetailInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDetailPoint(); } }}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                      />
                      <button
                        type="button"
                        onClick={addDetailPoint}
                        className="rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 p-2 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1"
                      >
                        <PlusCircle className="h-4 w-4" />
                        추가
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {expForm.details.map((pt, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 bg-white p-2 rounded-lg border border-slate-150 text-sm">
                          <span className="truncate">{pt}</span>
                          <button
                            type="button"
                            onClick={() => removeDetailPoint(idx)}
                            className="text-red-500 hover:text-red-700 transition"
                          >
                            <MinusCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skills Tagger */}
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-405">사용 기술 매핑</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {skillsList?.map((s) => {
                        const isChecked = expForm.skillIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border transition cursor-pointer text-xs ${
                              isChecked
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                                : 'bg-white border-slate-200 hover:border-indigo-150'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleExpSkill(s.id)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="truncate">{s.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsExpFormOpen(false)}
                      className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={createExpMutation.isPending || updateExpMutation.isPending}
                      className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {expEditingId !== null ? '수정 완료' : '이력 생성'}
                    </button>
                  </div>
                </form>
              )}

              {/* Experiences List */}
              <div className="space-y-2.5">
                {experiencesList?.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex rounded bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200">
                          {exp.type}
                        </span>
                        <p className="font-mono text-xs font-bold text-slate-400">
                          정렬 {exp.displayOrder}
                        </p>
                      </div>
                      <p className="truncate text-sm font-black text-slate-800 mt-1">{exp.title}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => {
                          setExpEditingId(exp.id);
                          setExpForm({
                            type: exp.type,
                            title: exp.title,
                            periodStart: exp.periodStart,
                            periodEnd: exp.periodEnd ?? '',
                            summary: exp.summary ?? '',
                            takeaway: exp.takeaway ?? '',
                            essayContent: exp.essayContent ?? '',
                            displayOrder: exp.displayOrder,
                            details: exp.details ?? [],
                            skillIds: exp.skills?.map((s) => s.id) ?? [],
                            companyName: exp.companyName ?? '',
                            employmentType: exp.employmentType ?? '정규직',
                            department: exp.department ?? '',
                            role: exp.role ?? '',
                            slug: exp.slug ?? '',
                            contributionRate: exp.contributionRate ?? 100,
                            institutionName: exp.institutionName ?? '',
                            issuer: exp.issuer ?? '',
                          });
                          setIsExpFormOpen(true);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-indigo-200 hover:text-indigo-650"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleExpDelete(exp.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:text-red-650"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
