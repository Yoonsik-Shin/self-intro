import { useState, type FormEvent, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
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
  MinusCircle,
  ChevronDown,
  ChevronUp,
  Search,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import {
  ApiError,
  studyApi,
  profileApi,
  skillApi,
  experienceApi,
  bffApi,
  type StudyRequest,
  type Study,
  type Skill,
  type Experience,
  type ExperienceRequest,
  type ExperienceDetailRequest
} from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { MarkdownEditor } from './MarkdownEditor';
import { markdownComponents } from '../lib/markdown';

type TabId = 'STUDY' | 'PROFILE' | 'SKILLS' | 'EXPERIENCE';

type StudyForm = Omit<StudyRequest, 'tagNames'> & { tagNames: string };

const emptyStudyForm: StudyForm = {
  slug: '',
  title: '',
  summary: '',
  contentMarkdown: '',
  status: 'DRAFT',
  categoryId: 1,
  tagNames: '',
  skillIds: [],
  experienceIds: [],
  experienceDetailIds: [],
  relatedStudies: [],
  learnedAt: new Date().toISOString().split('T')[0],
  publishedAt: null,
};

const toStudyRequest = (form: StudyForm): StudyRequest => ({
  ...form,
  tagNames: form.tagNames.split(',').map((tag) => tag.trim()).filter(Boolean),
});

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
  skillVersion: '',
  comment: '',
  usageType: 'LEARNING',
  isCore: false,
  displayOrder: 0,
};

const skillUsageOptions = [
  { value: 'LEARNING', label: '학습' },
  { value: 'WORK_EXPERIENCE', label: '실무 경험' },
  { value: 'PROJECT_USE', label: '프로젝트 활용' },
];

const emptyExperienceForm = {
  type: 'PROJECT' as ExperienceRequest['type'],
  title: '',
  periodStart: new Date().toISOString().split('T')[0],
  periodEnd: '',
  summary: '',
  takeaway: '',
  essayContent: '',
  displayOrder: 0,
  details: [] as ExperienceDetailRequest[],
  skillIds: [] as number[],
  tagNames: '',
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Unified API error handler for security expiration
  const handleMutationError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      setUnauthenticated();
    }
  };

  // --- QUERY HOOKS ---
  const { data: studyPage } = useQuery({
    queryKey: ['studies', 'admin'],
    queryFn: () => studyApi.adminList(),
  });

  const studies = studyPage?.content;

  const { data: studyCategories } = useQuery({
    queryKey: ['studyCategories'],
    queryFn: studyApi.categories,
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

  // --- TAB 1: STUDY STATE & MUTATIONS ---
  const [studyEditingId, setStudyEditingId] = useState<number | null>(null);
  const [studyForm, setStudyForm] = useState<StudyForm>(emptyStudyForm);
  const [isStudyFormOpen, setIsStudyFormOpen] = useState(false);
  const [expandedStudyId, setExpandedStudyId] = useState<number | null>(null);
  const [studySkillSearch, setStudySkillSearch] = useState('');
  const [studyExperienceSearch, setStudyExperienceSearch] = useState('');
  const [studyExperienceDetailSearch, setStudyExperienceDetailSearch] = useState('');
  const [relatedStudySearch, setRelatedStudySearch] = useState('');

  // --- FILTER STATES ---
  const [studyFilter, setStudyFilter] = useState<string>('ALL');
  const [studySearch, setStudySearch] = useState<string>('');

  const [skillFilter, setSkillFilter] = useState<string>('ALL');
  const [skillSearch, setSkillSearch] = useState<string>('');

  const [expFilter, setExpFilter] = useState<string>('ALL');
  const [expSearch, setExpSearch] = useState<string>('');
  const [expSkillSearch, setExpSkillSearch] = useState<string>('');

  // --- FILTERED DATA MEMOS ---
  const filteredStudies = useMemo(() => {
    return studies?.filter((study) => {
      const matchesCategory = studyFilter === 'ALL' || study.category.slug === studyFilter;
      const matchesSearch =
        !studySearch ||
        study.title.toLowerCase().includes(studySearch.toLowerCase()) ||
        study.summary.toLowerCase().includes(studySearch.toLowerCase()) ||
        study.contentMarkdown.toLowerCase().includes(studySearch.toLowerCase()) ||
        study.tags.some((tag) => tag.name.toLowerCase().includes(studySearch.toLowerCase())) ||
        study.skills.some((skill) => skill.name.toLowerCase().includes(studySearch.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [studies, studyFilter, studySearch]);

  const selectableExpSkills = useMemo(() => {
    const keyword = expSkillSearch.trim().toLowerCase();
    if (!keyword) return skillsList ?? [];
    return (skillsList ?? []).filter((skill) =>
      skill.name.toLowerCase().includes(keyword) ||
      skill.category.toLowerCase().includes(keyword));
  }, [skillsList, expSkillSearch]);

  const selectableStudySkills = useMemo(() => {
    const keyword = studySkillSearch.trim().toLowerCase();
    if (!keyword) return skillsList ?? [];
    return (skillsList ?? []).filter((skill) =>
      skill.name.toLowerCase().includes(keyword) ||
      skill.category.toLowerCase().includes(keyword));
  }, [skillsList, studySkillSearch]);

  const selectableStudyExperiences = useMemo(() => {
    const keyword = studyExperienceSearch.trim().toLowerCase();
    if (!keyword) return experiencesList ?? [];
    return (experiencesList ?? []).filter((experience) =>
      experience.title.toLowerCase().includes(keyword) ||
      experience.type.toLowerCase().includes(keyword));
  }, [experiencesList, studyExperienceSearch]);

  const selectableStudyExperienceDetails = useMemo(() => {
    const keyword = studyExperienceDetailSearch.trim().toLowerCase();
    return (experiencesList ?? [])
      .map((experience) => ({
        experience,
        details: experience.details.filter((detail) =>
          !keyword ||
          experience.title.toLowerCase().includes(keyword) ||
          detail.content.toLowerCase().includes(keyword)),
      }))
      .filter((group) => group.details.length > 0);
  }, [experiencesList, studyExperienceDetailSearch]);

  const selectableRelatedStudies = useMemo(() => {
    const keyword = relatedStudySearch.trim().toLowerCase();
    return (studies ?? []).filter((study) => {
      if (study.id === studyEditingId) return false;
      return !keyword ||
        study.title.toLowerCase().includes(keyword) ||
        study.slug.toLowerCase().includes(keyword);
    });
  }, [studies, studyEditingId, relatedStudySearch]);

  const filteredSkills = useMemo(() => {
    return skillsList?.filter((skill) => {
      const matchesCategory = skillFilter === 'ALL' || skill.category === skillFilter;
      const matchesSearch =
        !skillSearch ||
        skill.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
        (skill.comment ?? '').toLowerCase().includes(skillSearch.toLowerCase()) ||
        (skill.skillVersion ?? '').toLowerCase().includes(skillSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [skillsList, skillFilter, skillSearch]);

  const filteredExperiences = useMemo(() => {
    return experiencesList?.filter((exp) => {
      const matchesType = expFilter === 'ALL' || exp.type === expFilter;
      const matchesSearch =
        !expSearch ||
        exp.title.toLowerCase().includes(expSearch.toLowerCase()) ||
        (exp.summary && exp.summary.toLowerCase().includes(expSearch.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [experiencesList, expFilter, expSearch]);

  const createStudyMutation = useMutation({
    mutationFn: (form: StudyForm) => studyApi.create(toStudyRequest(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning'] });
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      setStudyForm(emptyStudyForm);
      setIsStudyFormOpen(false);
    },
    onError: handleMutationError,
  });

  const updateStudyMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: StudyForm }) =>
      studyApi.update(id, toStudyRequest(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning'] });
      queryClient.invalidateQueries({ queryKey: ['studies'] });
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
      queryClient.invalidateQueries({ queryKey: ['studies'] });
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
  const [expandedExpId, setExpandedExpId] = useState<number | null>(null);
  const [expandedDetailIdx, setExpandedDetailIdx] = useState<number | null>(null);

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
      tagNames: expForm.tagNames.split(',').map((tag) => tag.trim()).filter(Boolean),
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
        details: [...expForm.details, { content: detailInput.trim(), situation: '', actionDetail: '', outcome: '', skillIds: [] }],
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

  const updateDetailField = (idx: number, field: 'content' | 'situation' | 'actionDetail' | 'outcome', value: string) => {
    setExpForm({
      ...expForm,
      details: expForm.details.map((d, i) => (i === idx ? { ...d, [field]: value } : d)),
    });
  };

  const toggleDetailSkill = (idx: number, skillId: number) => {
    setExpForm({
      ...expForm,
      details: expForm.details.map((d, i) => {
        if (i !== idx) return d;
        const isChecked = d.skillIds.includes(skillId);
        return {
          ...d,
          skillIds: isChecked ? d.skillIds.filter((id) => id !== skillId) : [...d.skillIds, skillId],
        };
      }),
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
          <span className="text-xs font-bold text-slate-400">v1.5</span>
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

      <div className={`grid w-full grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:px-8 ${
        isSidebarCollapsed
          ? 'lg:grid-cols-[64px_minmax(0,1fr)]'
          : 'lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]'
      }`}>
        {/* SIDE BAR NAVIGATION */}
        <aside className={`min-w-0 space-y-1.5 transition-all duration-200 lg:sticky lg:top-20 lg:self-start ${
          isSidebarCollapsed
            ? 'lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white lg:px-2 lg:py-3 lg:shadow-sm'
            : ''
        }`}>
          <div className={`mb-2 flex h-8 items-center justify-between gap-2 px-2 ${isSidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest text-slate-400 ${isSidebarCollapsed ? 'lg:hidden' : ''}`}>메뉴 목록</p>
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
              title={isSidebarCollapsed ? '메뉴 펼치기' : '메뉴 접기'}
              aria-label={isSidebarCollapsed ? '메뉴 펼치기' : '메뉴 접기'}
              className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-900 lg:flex ${
                isSidebarCollapsed ? 'lg:border-transparent lg:bg-slate-50 lg:shadow-none' : ''
              }`}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
          <button
            onClick={() => { setActiveTab('STUDY'); setIsStudyFormOpen(false); }}
            title="공부 정리 관리"
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-bold text-left transition ${isSidebarCollapsed ? 'lg:mx-auto lg:h-11 lg:w-11 lg:justify-center lg:gap-0 lg:p-0' : ''} ${
              activeTab === 'STUDY'
                ? 'bg-slate-900 text-white shadow-sm shadow-slate-800/10'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>공부 정리 관리</span>
          </button>
          <button
            onClick={() => { setActiveTab('PROFILE'); }}
            title="프로필 정보 관리"
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-bold text-left transition ${isSidebarCollapsed ? 'lg:mx-auto lg:h-11 lg:w-11 lg:justify-center lg:gap-0 lg:p-0' : ''} ${
              activeTab === 'PROFILE'
                ? 'bg-slate-900 text-white shadow-sm shadow-slate-800/10'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <User className="h-4 w-4" />
            <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>프로필 정보 관리</span>
          </button>
          <button
            onClick={() => { setActiveTab('SKILLS'); setIsSkillFormOpen(false); }}
            title="기술 스택 관리"
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-bold text-left transition ${isSidebarCollapsed ? 'lg:mx-auto lg:h-11 lg:w-11 lg:justify-center lg:gap-0 lg:p-0' : ''} ${
              activeTab === 'SKILLS'
                ? 'bg-slate-900 text-white shadow-sm shadow-slate-800/10'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Cpu className="h-4 w-4" />
            <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>기술 스택 관리</span>
          </button>
          <button
            onClick={() => { setActiveTab('EXPERIENCE'); setIsExpFormOpen(false); }}
            title="이력 및 경력 관리"
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-bold text-left transition ${isSidebarCollapsed ? 'lg:mx-auto lg:h-11 lg:w-11 lg:justify-center lg:gap-0 lg:p-0' : ''} ${
              activeTab === 'EXPERIENCE'
                ? 'bg-slate-900 text-white shadow-sm shadow-slate-800/10'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>이력 및 경력 관리</span>
          </button>
        </aside>

        {/* MAIN PANEL CONTENT */}
        <section className="min-w-0 space-y-6">
          {/* ======================= STUDY TAB ======================= */}
          {activeTab === 'STUDY' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950">Study 관리</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Markdown 학습 문서와 관련 기술·프로젝트·경력을 관리합니다.</p>
                </div>
                <button
                  onClick={() => {
                    setStudyEditingId(null);
                    setStudyForm(emptyStudyForm);
                    setIsStudyFormOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  새 글 작성
                </button>
              </div>

              {/* FILTERS & SEARCH */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm animate-fadeIn">
                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                  {[{ slug: 'ALL', name: '전체' }, ...(studyCategories ?? [])].map((category) => (
                    <button
                      key={category.slug}
                      onClick={() => setStudyFilter(category.slug)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                        studyFilter === category.slug
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-100'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="제목, 본문, 기술 검색..."
                    value={studySearch}
                    onChange={(e) => setStudySearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs transition focus:border-slate-800 focus:outline-none bg-slate-50/50"
                  />
                </div>
              </div>

              {isStudyFormOpen && (
                <form onSubmit={handleStudySubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800">{studyEditingId !== null ? '글 수정' : '새 글 작성'}</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">제목</label>
                      <input
                        type="text"
                        required
                        value={studyForm.title}
                        onChange={(e) => setStudyForm({ ...studyForm, title: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Slug</label>
                      <input
                        type="text"
                        value={studyForm.slug}
                        onChange={(e) => setStudyForm({ ...studyForm, slug: e.target.value })}
                        placeholder="비워두면 제목으로 자동 생성"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">카테고리</label>
                      <select
                        value={studyForm.categoryId}
                        onChange={(e) => setStudyForm({ ...studyForm, categoryId: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      >
                        {(studyCategories ?? []).map((category) => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">공개 상태</label>
                      <select
                        value={studyForm.status}
                        onChange={(e) => setStudyForm({ ...studyForm, status: e.target.value as StudyForm['status'] })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      >
                        <option value="DRAFT">임시 저장</option>
                        <option value="PUBLISHED">공개</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">목록 요약</label>
                    <textarea
                      required
                      rows={2}
                      maxLength={500}
                      value={studyForm.summary}
                      onChange={(e) => setStudyForm({ ...studyForm, summary: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">태그 (쉼표 구분)</label>
                    <input
                      type="text"
                      value={studyForm.tagNames}
                      onChange={(e) => setStudyForm({ ...studyForm, tagNames: e.target.value })}
                      placeholder="트랜잭션, 동시성, 장애대응"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">기술 스택</label>
                      <div className="relative mb-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="search"
                          value={studySkillSearch}
                          onChange={(event) => setStudySkillSearch(event.target.value)}
                          placeholder="기술명 또는 분류 검색"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs outline-none transition focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-200"
                        />
                      </div>
                      <div className="max-h-44 space-y-1 overflow-auto rounded-xl border border-slate-200 p-3">
                        {selectableStudySkills.map((skill) => (
                          <label key={skill.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={studyForm.skillIds.includes(skill.id)}
                              onChange={(event) => setStudyForm({
                                ...studyForm,
                                skillIds: event.target.checked
                                  ? [...studyForm.skillIds, skill.id]
                                  : studyForm.skillIds.filter((id) => id !== skill.id),
                              })}
                            />
                            {skill.name}
                          </label>
                        ))}
                        {selectableStudySkills.length === 0 && (
                          <p className="py-4 text-center text-xs font-semibold text-slate-400">검색 결과가 없습니다.</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">관련 프로젝트·경력</label>
                      <div className="relative mb-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="search"
                          value={studyExperienceSearch}
                          onChange={(event) => setStudyExperienceSearch(event.target.value)}
                          placeholder="제목 또는 유형 검색"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs outline-none transition focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-200"
                        />
                      </div>
                      <div className="max-h-44 space-y-1 overflow-auto rounded-xl border border-slate-200 p-3">
                        {selectableStudyExperiences.map((experience) => (
                          <label key={experience.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={studyForm.experienceIds.includes(experience.id)}
                              onChange={(event) => setStudyForm({
                                ...studyForm,
                                experienceIds: event.target.checked
                                  ? [...studyForm.experienceIds, experience.id]
                                  : studyForm.experienceIds.filter((id) => id !== experience.id),
                              })}
                            />
                            <span className="font-mono text-slate-400">{experience.type}</span>
                            {experience.title}
                          </label>
                        ))}
                        {selectableStudyExperiences.length === 0 && (
                          <p className="py-4 text-center text-xs font-semibold text-slate-400">검색 결과가 없습니다.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">관련 경력 상세 항목</label>
                    <div className="relative mb-2">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={studyExperienceDetailSearch}
                        onChange={(event) => setStudyExperienceDetailSearch(event.target.value)}
                        placeholder="경력 제목 또는 항목 내용 검색"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs outline-none transition focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="max-h-52 space-y-3 overflow-auto rounded-xl border border-slate-200 p-3">
                      {selectableStudyExperienceDetails.map(({ experience, details }) => (
                        <div key={experience.id}>
                          <p className="mb-1 px-2 text-[11px] font-bold text-slate-400">{experience.title}</p>
                          {details.map((detail) => (
                            <label key={detail.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={studyForm.experienceDetailIds.includes(detail.id)}
                                onChange={(event) => setStudyForm({
                                  ...studyForm,
                                  experienceDetailIds: event.target.checked
                                    ? [...studyForm.experienceDetailIds, detail.id]
                                    : studyForm.experienceDetailIds.filter((id) => id !== detail.id),
                                })}
                              />
                              {detail.content}
                            </label>
                          ))}
                        </div>
                      ))}
                      {selectableStudyExperienceDetails.length === 0 && (
                        <p className="py-4 text-center text-xs font-semibold text-slate-400">검색 결과가 없습니다.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">관련 Study</label>
                    <div className="relative mb-2">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={relatedStudySearch}
                        onChange={(event) => setRelatedStudySearch(event.target.value)}
                        placeholder="Study 제목 또는 slug 검색"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs outline-none transition focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="max-h-52 space-y-2 overflow-auto rounded-xl border border-slate-200 p-3">
                      {selectableRelatedStudies.map((study) => {
                        const relation = studyForm.relatedStudies.find((item) => item.studyId === study.id);
                        return (
                          <div key={study.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={Boolean(relation)}
                              onChange={(event) => setStudyForm({
                                ...studyForm,
                                relatedStudies: event.target.checked
                                  ? [...studyForm.relatedStudies, { studyId: study.id, type: 'RELATED' }]
                                  : studyForm.relatedStudies.filter((item) => item.studyId !== study.id),
                              })}
                            />
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold">{study.title}</span>
                            {relation && (
                              <select
                                value={relation.type}
                                onChange={(event) => setStudyForm({
                                  ...studyForm,
                                  relatedStudies: studyForm.relatedStudies.map((item) => item.studyId === study.id
                                    ? { ...item, type: event.target.value as typeof item.type }
                                    : item),
                                })}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px]"
                              >
                                <option value="RELATED">일반 관련</option>
                                <option value="PREREQUISITE">선행 학습</option>
                                <option value="FOLLOW_UP">후속 학습</option>
                                <option value="APPLIED_TO">적용 사례</option>
                              </select>
                            )}
                          </div>
                        );
                      })}
                      {selectableRelatedStudies.length === 0 && (
                        <p className="py-4 text-center text-xs font-semibold text-slate-400">검색 결과가 없습니다.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Markdown 본문</label>
                    <MarkdownEditor
                      value={studyForm.contentMarkdown}
                      onChange={(contentMarkdown) => setStudyForm({ ...studyForm, contentMarkdown })}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">학습일</label>
                    <input
                      type="date"
                      required
                      value={studyForm.learnedAt}
                      onChange={(e) => setStudyForm({ ...studyForm, learnedAt: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
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
                      className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
                    >
                      {studyEditingId !== null ? '수정 완료' : '작성 완료'}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2.5">
                {filteredStudies?.map((study) => {
                  const isExpanded = expandedStudyId === study.id;
                  return (
                    <div
                      key={study.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => setExpandedStudyId(isExpanded ? null : study.id)}
                        >
                          <p className="font-mono text-xs font-bold text-slate-400">
                            {study.learnedAt} · {study.category.name} · {study.status === 'PUBLISHED' ? '공개' : '초안'}
                          </p>
                          <p className="text-sm font-black text-slate-800 hover:text-slate-900 transition">{study.title}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => {
                              setStudyEditingId(study.id);
                              setStudyForm({
                                slug: study.slug,
                                title: study.title,
                                summary: study.summary,
                                contentMarkdown: study.contentMarkdown,
                                status: study.status,
                                categoryId: study.category.id,
                                tagNames: study.tags.map((tag) => tag.name).join(', '),
                                skillIds: study.skills.map((skill) => skill.id),
                                experienceIds: study.experiences.map((experience) => experience.id),
                                experienceDetailIds: study.experienceDetails.map((detail) => detail.id),
                                relatedStudies: study.relatedStudies.map((related) => ({ studyId: related.id, type: related.type })),
                                learnedAt: study.learnedAt,
                                publishedAt: study.publishedAt ?? null,
                              });
                              setIsStudyFormOpen(true);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleStudyDelete(study.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-100 text-xs space-y-3 text-slate-600">
                          <div>
                            <h5 className="font-bold text-slate-400 uppercase tracking-wider mb-1">요약</h5>
                            <p className="font-medium">{study.summary}</p>
                          </div>
                          {study.tags.length > 0 && (
                            <div>
                              <h5 className="font-bold text-slate-400 uppercase tracking-wider mb-1">태그</h5>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {study.tags.map((tag) => (
                                  <span key={tag.id} className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600">
                                    #{tag.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <p className="line-clamp-5 whitespace-pre-wrap font-mono text-[11px] text-slate-500">{study.contentMarkdown}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">이름 (한글)</label>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">이름 (영문)</label>
                    <input
                      type="text"
                      required
                      value={profileForm.nameEn}
                      onChange={(e) => setProfileForm({ ...profileForm, nameEn: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">희망 직무 타이틀</label>
                    <input
                      type="text"
                      required
                      value={profileForm.jobTitle}
                      onChange={(e) => setProfileForm({ ...profileForm, jobTitle: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">활동 배지 상태 텍스트</label>
                    <input
                      type="text"
                      required
                      value={profileForm.statusBadgeText}
                      onChange={(e) => setProfileForm({ ...profileForm, statusBadgeText: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Bio (대표 소개 문장)</label>
                  <textarea
                    required
                    rows={3}
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">경력 요약 문구 (예: 1년 11개월...)</label>
                    <input
                      type="text"
                      required
                      value={profileForm.careerSummary}
                      onChange={(e) => setProfileForm({ ...profileForm, careerSummary: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">핵심 기술 요약 문구 (예: Java / Node.js...)</label>
                    <input
                      type="text"
                      required
                      value={profileForm.coreStackSummary}
                      onChange={(e) => setProfileForm({ ...profileForm, coreStackSummary: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">GitHub 주소</label>
                    <input
                      type="url"
                      required
                      value={profileForm.githubUrl}
                      onChange={(e) => setProfileForm({ ...profileForm, githubUrl: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">이메일</label>
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">연락처</label>
                    <input
                      type="text"
                      required
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
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
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  새 기술 추가
                </button>
              </div>

              {/* FILTERS & SEARCH */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm animate-fadeIn">
                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                  {['ALL', 'LANGUAGE', 'FRAMEWORK', 'DATABASE', 'DEVOPS', 'AI_RAG', 'ETC'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSkillFilter(cat)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                        skillFilter === cat
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-100'
                      }`}
                    >
                      {cat === 'ALL'
                        ? '전체'
                        : cat === 'LANGUAGE'
                        ? '언어'
                        : cat === 'FRAMEWORK'
                        ? '프레임워크'
                        : cat === 'DATABASE'
                        ? 'DB'
                        : cat === 'DEVOPS'
                        ? '인프라/DevOps'
                        : cat === 'AI_RAG'
                        ? 'AI/RAG'
                        : '기타'}
                    </button>
                  ))}
                </div>
                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="기술명 검색..."
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs transition focus:border-slate-800 focus:outline-none bg-slate-50/50"
                  />
                </div>
              </div>

              {isSkillFormOpen && (
                <form onSubmit={handleSkillSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800">{skillEditingId !== null ? '기술 수정' : '새 기술 추가'}</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">기술 스택명</label>
                      <input
                        type="text"
                        required
                        placeholder="예: Java, React"
                        value={skillForm.name}
                        onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">분류 카테고리</label>
                      <select
                        value={skillForm.category}
                        onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
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

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">기술 레벨</label>
                      <input
                        type="text"
                        value={skillForm.skillLevel}
                        placeholder="예: 중급, 고급, 상"
                        onChange={(e) => setSkillForm({ ...skillForm, skillLevel: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">버전</label>
                      <input
                        type="text"
                        value={skillForm.skillVersion}
                        placeholder="예: 21, 3.3, 19"
                        onChange={(e) => setSkillForm({ ...skillForm, skillVersion: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">활용 구분</label>
                      <select
                        value={skillForm.usageType}
                        onChange={(e) => setSkillForm({ ...skillForm, usageType: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      >
                        {skillUsageOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">정렬 순서</label>
                      <input
                        type="number"
                        required
                        value={skillForm.displayOrder}
                        onChange={(e) => setSkillForm({ ...skillForm, displayOrder: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={skillForm.isCore}
                          onChange={(e) => setSkillForm({ ...skillForm, isCore: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-800"
                        />
                        <span className="text-xs font-bold text-slate-600 uppercase">핵심기술로 표시</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">코멘트</label>
                    <textarea
                      rows={3}
                      value={skillForm.comment}
                      placeholder="이 기술을 어느 수준으로, 어디에 활용했는지 짧게 남깁니다."
                      onChange={(e) => setSkillForm({ ...skillForm, comment: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
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
                      className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
                    >
                      {skillEditingId !== null ? '수정 완료' : '추가 완료'}
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredSkills?.map((skill) => (
                  <div
                    key={skill.id}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate font-mono text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        {skill.category} {skill.skillLevel ? `· ${skill.skillLevel}` : ''}
                        {skill.skillVersion ? ` · v${skill.skillVersion}` : ''}
                      </p>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          title={`${skill.name} 수정`}
                          aria-label={`${skill.name} 수정`}
                          onClick={() => {
                            setSkillEditingId(skill.id);
                            setSkillForm({
                              name: skill.name,
                              category: skill.category,
                              skillLevel: skill.skillLevel ?? '',
                              skillVersion: skill.skillVersion ?? '',
                              comment: skill.comment ?? '',
                              usageType: skill.usageType ?? 'LEARNING',
                              isCore: skill.isCore,
                              displayOrder: skill.displayOrder,
                            });
                            setIsSkillFormOpen(true);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title={`${skill.name} 삭제`}
                          aria-label={`${skill.name} 삭제`}
                          onClick={() => handleSkillDelete(skill.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="-mt-0.5 flex min-w-0 items-center gap-1.5 text-sm font-black text-slate-800">
                      <span className="truncate">{skill.name}</span>
                      {skill.isCore && (
                        <span className="shrink-0 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-900">Core</span>
                      )}
                      <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                        {skillUsageOptions.find((option) => option.value === skill.usageType)?.label ?? skill.usageType}
                      </span>
                    </h4>
                    {skill.comment && (
                      <p className="mt-1 line-clamp-1 text-[11px] font-medium leading-4 text-slate-500">{skill.comment}</p>
                    )}
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
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  이력 추가
                </button>
              </div>

              {/* FILTERS & SEARCH */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm animate-fadeIn">
                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                  {['ALL', 'CAREER', 'PROJECT', 'EDUCATION', 'CERTIFICATE'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setExpFilter(cat)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                        expFilter === cat
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-100'
                      }`}
                    >
                      {cat === 'ALL'
                        ? '전체'
                        : cat === 'CAREER'
                        ? '회사 경력'
                        : cat === 'PROJECT'
                        ? '프로젝트'
                        : cat === 'EDUCATION'
                        ? '학력'
                        : '자격증'}
                    </button>
                  ))}
                </div>
                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="이력명, 성과 검색..."
                    value={expSearch}
                    onChange={(e) => setExpSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs transition focus:border-slate-800 focus:outline-none bg-slate-50/50"
                  />
                </div>
              </div>

              {isExpFormOpen && (
                <form onSubmit={handleExpSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800">{expEditingId !== null ? '이력 수정' : '새 이력 추가'}</h3>
                  
                  {/* Common: Type, Title, displayOrder */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">이력 구분 (유형)</label>
                      <select
                        value={expForm.type}
                        onChange={(e) => setExpForm({ ...expForm, type: e.target.value as any })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      >
                        <option value="CAREER">회사 경력 (CAREER)</option>
                        <option value="PROJECT">프로젝트 (PROJECT)</option>
                        <option value="EDUCATION">학력/학습 (EDUCATION)</option>
                        <option value="CERTIFICATE">자격증 (CERTIFICATE)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">이력명 (타이틀)</label>
                      <input
                        type="text"
                        required
                        value={expForm.title}
                        onChange={(e) => setExpForm({ ...expForm, title: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  </div>

                  {/* Common: Period, displayOrder */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">시작일</label>
                      <input
                        type="date"
                        required
                        value={expForm.periodStart}
                        onChange={(e) => setExpForm({ ...expForm, periodStart: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">종료일 (없으면 비워둠)</label>
                      <input
                        type="date"
                        value={expForm.periodEnd}
                        onChange={(e) => setExpForm({ ...expForm, periodEnd: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">정렬 순서</label>
                      <input
                        type="number"
                        required
                        value={expForm.displayOrder}
                        onChange={(e) => setExpForm({ ...expForm, displayOrder: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">태그 (쉼표 구분)</label>
                    <input
                      type="text"
                      value={expForm.tagNames}
                      onChange={(e) => setExpForm({ ...expForm, tagNames: e.target.value })}
                      placeholder="리드, 아키텍처, 마이그레이션"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  {/* Subtype Conditional Fields */}
                  {expForm.type === 'CAREER' && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 rounded-xl bg-slate-100/20 border border-slate-200/50 p-4">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">회사명</label>
                        <input
                          type="text"
                          required
                          value={expForm.companyName}
                          onChange={(e) => setExpForm({ ...expForm, companyName: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">고용 형태</label>
                        <input
                          type="text"
                          required
                          value={expForm.employmentType}
                          onChange={(e) => setExpForm({ ...expForm, employmentType: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">부서명</label>
                        <input
                          type="text"
                          required
                          value={expForm.department}
                          onChange={(e) => setExpForm({ ...expForm, department: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">담당 직무 (역할)</label>
                        <input
                          type="text"
                          required
                          value={expForm.role}
                          onChange={(e) => setExpForm({ ...expForm, role: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {expForm.type === 'PROJECT' && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-xl bg-slate-100/20 border border-slate-200/50 p-4">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">프로젝트 식별자 (slug)</label>
                        <input
                          type="text"
                          required
                          placeholder="예: project1, project2"
                          value={expForm.slug}
                          onChange={(e) => setExpForm({ ...expForm, slug: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
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
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
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
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {expForm.type === 'EDUCATION' && (
                    <div className="rounded-xl bg-slate-100/20 border border-slate-200/50 p-4">
                      <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">학교 또는 교육 기관명</label>
                      <input
                        type="text"
                        required
                        placeholder="예: OO대학교 컴퓨터공학"
                        value={expForm.institutionName}
                        onChange={(e) => setExpForm({ ...expForm, institutionName: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                      />
                    </div>
                  )}

                  {expForm.type === 'CERTIFICATE' && (
                    <div className="rounded-xl bg-slate-100/20 border border-slate-200/50 p-4">
                      <label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-widest">발급 기관</label>
                      <input
                        type="text"
                        required
                        placeholder="예: 한국산업인력공단"
                        value={expForm.issuer}
                        onChange={(e) => setExpForm({ ...expForm, issuer: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-800 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Common Text Areas */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">한줄 요약 (Summary, 마크다운)</label>
                    <MarkdownEditor
                      value={expForm.summary}
                      onChange={(summary) => setExpForm({ ...expForm, summary })}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Takeaway (성과 및 배운점, 마크다운)</label>
                    <MarkdownEditor
                      value={expForm.takeaway}
                      onChange={(takeaway) => setExpForm({ ...expForm, takeaway })}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">역량 기술서 본문 내용 (Essay Content, 마크다운, Optional)</label>
                    <MarkdownEditor
                      value={expForm.essayContent}
                      onChange={(essayContent) => setExpForm({ ...expForm, essayContent })}
                    />
                  </div>

                  {/* Dynamic Details List (Bullet Points) */}
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">이력 상세 항목 (Bullet Points)</label>
                    
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="새로운 불릿 항목 상세 입력..."
                        value={detailInput}
                        onChange={(e) => setDetailInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDetailPoint(); } }}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:border-slate-800 bg-white"
                      />
                      <button
                        type="button"
                        onClick={addDetailPoint}
                        className="rounded-lg bg-slate-100 border border-slate-300 text-slate-900 p-2 hover:bg-slate-200 text-xs font-bold flex items-center gap-1"
                      >
                        <PlusCircle className="h-4 w-4" />
                        추가
                      </button>
                    </div>

                    <div className="space-y-2">
                      {expForm.details.map((d, idx) => {
                        const isDetailExpanded = expandedDetailIdx === idx;
                        return (
                          <div key={idx} className="bg-white rounded-lg border border-slate-200 text-sm">
                            <div className="flex items-center justify-between gap-2 p-2">
                              <input
                                type="text"
                                value={d.content}
                                onChange={(e) => updateDetailField(idx, 'content', e.target.value)}
                                placeholder="불릿 한 줄 요약"
                                className="min-w-0 flex-1 rounded-md border border-transparent px-2 py-1 text-sm focus:border-slate-400 focus:bg-slate-100/30 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setExpandedDetailIdx(isDetailExpanded ? null : idx)}
                                className="text-slate-400 transition hover:text-slate-900"
                              >
                                {isDetailExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeDetailPoint(idx)}
                                className="text-red-500 transition hover:text-red-700"
                              >
                                <MinusCircle className="h-4 w-4" />
                              </button>
                            </div>

                            {isDetailExpanded && (
                              <div className="space-y-2 border-t border-slate-100 p-3">
                                <div>
                                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">상황 (Situation, 마크다운)</label>
                                  <MarkdownEditor
                                    value={d.situation ?? ''}
                                    onChange={(value) => updateDetailField(idx, 'situation', value)}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">과정 (Action, 마크다운)</label>
                                  <MarkdownEditor
                                    value={d.actionDetail ?? ''}
                                    onChange={(value) => updateDetailField(idx, 'actionDetail', value)}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">성과 (Outcome, 마크다운)</label>
                                  <MarkdownEditor
                                    value={d.outcome ?? ''}
                                    onChange={(value) => updateDetailField(idx, 'outcome', value)}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">이 항목의 기술 태그</label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {skillsList?.map((s) => {
                                      const isChecked = d.skillIds.includes(s.id);
                                      return (
                                        <button
                                          type="button"
                                          key={s.id}
                                          onClick={() => toggleDetailSkill(idx, s.id)}
                                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold transition ${
                                            isChecked
                                              ? 'border-slate-300 bg-slate-100 text-slate-950'
                                              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                          }`}
                                        >
                                          {s.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Skills Tagger */}
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">사용 기술 매핑</label>
                    <div className="relative mb-2">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={expSkillSearch}
                        onChange={(event) => setExpSkillSearch(event.target.value)}
                        placeholder="기술명 또는 분류 검색"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none transition focus:border-slate-800 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="grid max-h-56 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
                      {selectableExpSkills.map((s) => {
                        const isChecked = expForm.skillIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className={`flex items-start gap-2 p-2 rounded-lg border transition cursor-pointer text-xs ${
                              isChecked
                                ? 'bg-slate-100 border-slate-300 text-slate-950 font-bold'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleExpSkill(s.id)}
                              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-800"
                            />
                            <span className="min-w-0">
                              <span className="block truncate">{s.name}</span>
                              <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400">
                                {skillUsageOptions.find((option) => option.value === s.usageType)?.label ?? s.usageType}
                                {s.skillVersion ? ` · v${s.skillVersion}` : ''}
                                {s.skillLevel ? ` · ${s.skillLevel}` : ''}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                      {selectableExpSkills.length === 0 && (
                        <p className="col-span-full py-4 text-center text-xs font-semibold text-slate-400">검색 결과가 없습니다.</p>
                      )}
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
                      className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
                    >
                      {expEditingId !== null ? '수정 완료' : '이력 생성'}
                    </button>
                  </div>
                </form>
              )}

              {/* Experiences List */}
              <div className="space-y-2.5">
                {filteredExperiences?.map((exp) => {
                  const isExpanded = expandedExpId === exp.id;
                  return (
                    <div
                      key={exp.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => setExpandedExpId(isExpanded ? null : exp.id)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="inline-flex rounded bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200">
                              {exp.type}
                            </span>
                            <p className="font-mono text-xs font-bold text-slate-400">
                              정렬 {exp.displayOrder}
                            </p>
                          </div>
                          <p className="text-sm font-black text-slate-800 mt-1 hover:text-slate-900 transition">{exp.title}</p>
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
                                details: (exp.details ?? []).map((d) => ({
                                  id: d.id,
                                  content: d.content,
                                  situation: d.situation ?? '',
                                  actionDetail: d.actionDetail ?? '',
                                  outcome: d.outcome ?? '',
                                  skillIds: d.skills?.map((s) => s.id) ?? [],
                                })),
                                skillIds: exp.skills?.map((s) => s.id) ?? [],
                                tagNames: exp.tags?.map((t) => t.name).join(', ') ?? '',
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
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleExpDelete(exp.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-100 text-xs space-y-3 text-slate-600">
                          {exp.summary && (
                            <div>
                              <h5 className="font-bold text-slate-400 uppercase tracking-wider mb-1">한줄 요약</h5>
                              <div className="font-medium text-slate-700"><ReactMarkdown components={markdownComponents}>{exp.summary}</ReactMarkdown></div>
                            </div>
                          )}
                          {exp.takeaway && (
                            <div>
                              <h5 className="font-bold text-slate-400 uppercase tracking-wider mb-1">Takeaway (핵심 성과)</h5>
                              <div className="font-medium text-slate-700"><ReactMarkdown components={markdownComponents}>{exp.takeaway}</ReactMarkdown></div>
                            </div>
                          )}
                          {exp.details && exp.details.length > 0 && (
                            <div>
                              <h5 className="font-bold text-slate-400 uppercase tracking-wider mb-1">상세 항목 (Bullet Points)</h5>
                              <div className="mt-1 space-y-2">
                                {exp.details.map((d) => (
                                  <div key={d.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-2">
                                    <p className="font-bold text-slate-700">{d.content}</p>
                                    {d.situation && <div className="mt-1 text-slate-500"><span className="font-bold">상황: </span><ReactMarkdown components={markdownComponents}>{d.situation}</ReactMarkdown></div>}
                                    {d.actionDetail && <div className="mt-1 text-slate-500"><span className="font-bold">과정: </span><ReactMarkdown components={markdownComponents}>{d.actionDetail}</ReactMarkdown></div>}
                                    {d.outcome && <div className="mt-1 text-slate-500"><span className="font-bold">성과: </span><ReactMarkdown components={markdownComponents}>{d.outcome}</ReactMarkdown></div>}
                                    {d.skills.length > 0 && (
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {d.skills.map((s) => (
                                          <span key={s.id} className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-900 border border-slate-200">
                                            {s.name}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {exp.skills && exp.skills.length > 0 && (
                            <div>
                              <h5 className="font-bold text-slate-400 uppercase tracking-wider mb-1">연관 기술 스택</h5>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {exp.skills.map((s) => (
                                  <span key={s.id} className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-900 border border-slate-200">
                                    {s.name}
                                    {s.skillVersion ? ` v${s.skillVersion}` : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {exp.tags && exp.tags.length > 0 && (
                            <div>
                              <h5 className="font-bold text-slate-400 uppercase tracking-wider mb-1">태그</h5>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {exp.tags.map((t) => (
                                  <span key={t.id} className="bg-blue-50 px-2 py-0.5 rounded text-[10px] font-bold text-blue-700 border border-blue-100">
                                    #{t.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {exp.essayContent && (
                            <div>
                              <h5 className="font-bold text-slate-400 uppercase tracking-wider mb-1">에세이 상세내용 (Essay Content)</h5>
                              <div className="font-medium text-slate-700"><ReactMarkdown components={markdownComponents}>{exp.essayContent}</ReactMarkdown></div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
