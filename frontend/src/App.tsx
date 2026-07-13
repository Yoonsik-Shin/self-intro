import { type FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  BookOpen,
  CalendarPlus,
  Code2,
  Database,
  Github,
  GraduationCap,
  Layers3,
  Moon,
  Search,
  Server,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { studyApi, type CreateStudyEntryRequest, type StudyEntry } from './lib/api';
import { useIntroStore } from './store/useIntroStore';

const milestones = [
  {
    id: 'graduation',
    label: '대학 졸업',
    period: 'Foundation',
    title: '컴퓨터공학 기반 학습',
    body: '자료구조, 운영체제, 데이터베이스를 학습하며 문제를 구조화하는 습관을 만들었습니다.',
    accent: 'from-sky-400 to-cyan-300',
  },
  {
    id: 'certificate',
    label: '정보처리기사 취득',
    period: 'Certificate',
    title: '개발 전반의 기본기 검증',
    body: '요구사항 분석부터 테스트, 배포까지 소프트웨어 생명주기를 정리했습니다.',
    accent: 'from-amber-300 to-orange-400',
  },
  {
    id: 'sqld',
    label: 'SQLD 취득',
    period: 'Database',
    title: '데이터 모델링과 SQL',
    body: '정규화, 인덱스, 조인, 트랜잭션 관점에서 백엔드 저장소를 바라봅니다.',
    accent: 'from-emerald-300 to-teal-400',
  },
  {
    id: 'education',
    label: '교육 및 프로젝트',
    period: 'Build',
    title: 'Spring 기반 실전 프로젝트',
    body: 'Java, Spring Boot, JPA, QueryDSL로 API를 설계하고 React 기반 화면과 연결합니다.',
    accent: 'from-violet-300 to-fuchsia-400',
  },
];

const fallbackEntries: StudyEntry[] = [
  {
    id: 1,
    title: 'Spring Boot + JPA 게시 API',
    description: '학습 기록을 저장하고 조회하는 REST API를 설계했습니다.',
    category: 'PROJECT',
    skills: ['Java', 'Spring Boot', 'JPA', 'QueryDSL'],
    takeaway: '도메인 기준으로 계층을 나누고 조회 조건은 QueryDSL로 분리했습니다.',
    learnedAt: '2026-07-05',
  },
  {
    id: 2,
    title: 'React 상태/서버 상태 분리',
    description: '화면 상태는 Zustand, 서버 데이터는 TanStack Query로 관리했습니다.',
    category: 'EDUCATION',
    skills: ['React', 'Tailwind CSS', 'Zustand', 'TanStack Query'],
    takeaway: '클라이언트 상태와 서버 캐시의 책임을 분리하면 화면 흐름이 단순해집니다.',
    learnedAt: '2026-07-05',
  },
];

const categoryLabels = {
  ALL: '전체',
  EDUCATION: '교육',
  PROJECT: '프로젝트',
  CERTIFICATE: '자격',
} as const;

const iconByCategory = {
  EDUCATION: GraduationCap,
  PROJECT: Code2,
  CERTIFICATE: Trophy,
};

export function App() {
  const queryClient = useQueryClient();
  const { activeCategory, selectedMilestoneId, setActiveCategory, setSelectedMilestoneId } = useIntroStore();
  const [form, setForm] = useState<CreateStudyEntryRequest>({
    title: '',
    description: '',
    category: 'EDUCATION',
    skills: '',
    takeaway: '',
    learnedAt: new Date().toISOString().slice(0, 10),
  });

  const selectedMilestone = milestones.find((milestone) => milestone.id === selectedMilestoneId) ?? milestones[0];
  const selectedMilestoneIndex = milestones.findIndex((milestone) => milestone.id === selectedMilestone.id);
  const { data, isError, isLoading } = useQuery({
    queryKey: ['study-entries', activeCategory],
    queryFn: () => studyApi.list(activeCategory),
  });
  const entries = data ?? fallbackEntries;

  const filteredEntries = useMemo(
    () => entries.filter((entry) => activeCategory === 'ALL' || entry.category === activeCategory),
    [activeCategory, entries],
  );

  const createMutation = useMutation({
    mutationFn: studyApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-entries'] });
      setForm({
        title: '',
        description: '',
        category: 'EDUCATION',
        skills: '',
        takeaway: '',
        learnedAt: new Date().toISOString().slice(0, 10),
      });
    },
  });

  const submitStudyEntry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#0b0f14] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/86 px-3 py-2 shadow-lg shadow-black/25 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-[1500px] items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-300 text-base font-black text-slate-950 shadow-sm shadow-emerald-950/30">
            SI
          </div>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-300 md:flex">
            {['연혁', 'A4 소개', '학습 기록', '등록'].map((item) => (
              <a key={item} href="#" className="transition hover:text-white">
                {item}
              </a>
            ))}
          </nav>

          <div className="min-w-0 flex-1">
            <label className="mx-auto flex h-10 max-w-[470px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.055] px-3 text-slate-100 shadow-inner shadow-black/15 ring-1 ring-black/20">
              <Search className="h-5 w-5 shrink-0 text-emerald-200/80" aria-hidden />
              <input
                aria-label="학습 기록 검색"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500"
                placeholder="학습 기록, 프로젝트, 기술 검색"
              />
              <span className="hidden rounded-md border border-white/10 bg-slate-950/70 px-2 py-1 text-xs font-black text-slate-400 sm:inline">
                ⌘ K
              </span>
            </label>
          </div>

          <div className="hidden items-center gap-3 text-slate-300 lg:flex">
            <Github className="h-5 w-5" aria-hidden />
            <span className="h-7 w-px bg-white/10" />
            <button type="button" className="rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-black text-emerald-100">
              Java 21
            </button>
            <button type="button" className="rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-black text-sky-100">
              Spring Boot
            </button>
            <span className="h-7 w-px bg-white/10" />
            <button type="button" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.055] text-slate-200">
              <Moon className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1500px] grid-cols-1 gap-0 px-4 py-4 sm:px-6 lg:grid-cols-[330px_1fr] lg:px-8 lg:py-8">
        <aside className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-emerald-400/20 via-sky-400/10 to-transparent" />
          <div className="relative">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-200/80">Timeline</p>
                <h2 className="mt-2 text-2xl font-black text-white">성장 기록</h2>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-950/30">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
            </div>

            <div className="space-y-3">
              {milestones.map((milestone, index) => {
                const isSelected = milestone.id === selectedMilestoneId;

                return (
                  <button
                    key={milestone.id}
                    type="button"
                    onClick={() => setSelectedMilestoneId(milestone.id)}
                    className={`group relative w-full rounded-lg border p-4 text-left transition ${
                      isSelected
                        ? 'border-white/20 bg-white/[0.11] shadow-xl shadow-black/20'
                        : 'border-white/8 bg-white/[0.035] hover:border-white/16 hover:bg-white/[0.07]'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <span
                      className={`absolute bottom-4 left-4 top-4 w-1 rounded-lg bg-gradient-to-b ${milestone.accent} ${
                        isSelected ? 'opacity-100' : 'opacity-35'
                      }`}
                    />
                    <span className="flex items-start gap-4 pl-3">
                      <span
                        className={`mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-black ${
                          isSelected ? 'bg-white text-slate-950' : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span>
                        <span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          {milestone.period}
                        </span>
                        <span className="mt-1 block text-lg font-black text-white">{milestone.label}</span>
                        <span className="mt-2 block text-sm leading-6 text-slate-400">{milestone.title}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 rounded-lg border border-white/10 bg-slate-950/50 p-4">
              <p className="text-sm font-bold text-slate-300">현재 스택</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Java', 'Spring Boot', 'JPA', 'QueryDSL', 'React'].map((skill) => (
                  <span key={skill} className="rounded-lg bg-white/8 px-3 py-1.5 text-xs font-bold text-slate-200">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="relative px-0 pt-5 lg:px-8 lg:pt-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-200/70">A4 Preview</p>
              <h1 className="mt-1 text-2xl font-black text-white">선택 항목별 소개 페이지</h1>
            </div>
            <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300">
              210 x 297 기준
            </p>
          </div>

          <div className="mx-auto w-full max-w-[760px]">
            <article
              data-testid="a4-sheet"
              className="aspect-[210/297] w-full overflow-hidden rounded-lg bg-[#f7f3ea] p-[4.6%] text-slate-950 shadow-2xl shadow-black/40 ring-1 ring-black/10 sm:p-[5.8%]"
            >
              <div className="flex h-full flex-col">
                <header className="border-b border-slate-950/15 pb-3 sm:pb-5">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-[0.72rem] font-black uppercase tracking-[0.28em] text-slate-500">
                        Backend Developer Portfolio
                      </p>
                      <h2 className="mt-3 text-[clamp(1.35rem,6.4vw,4.1rem)] font-black leading-[0.96] tracking-normal sm:mt-5">
                        Java/Spring으로
                        <span className="block text-emerald-700">기록 가능한 서비스</span>
                      </h2>
                    </div>
                    <div className="min-w-20 text-right">
                      <p className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-slate-500">Page</p>
                      <p className="mt-1 text-2xl font-black sm:mt-2 sm:text-4xl">{String(selectedMilestoneIndex + 1).padStart(2, '0')}</p>
                    </div>
                  </div>
                  <p className="mt-3 max-w-[34rem] text-[clamp(0.68rem,1.5vw,1.05rem)] font-semibold leading-5 text-slate-700 sm:mt-5 sm:leading-7">
                    학습한 개념을 API와 데이터 모델로 연결하고, 프로젝트 경험과 회고를 누적해 성장 과정을 보여줍니다.
                  </p>
                </header>

                <section className="grid flex-1 grid-rows-[auto_auto_1fr_auto] gap-2 py-3 sm:gap-5 sm:py-5">
                  <div className="grid grid-cols-[1fr_auto] gap-5">
                    <div>
                      <p className="text-[0.72rem] font-black uppercase tracking-[0.22em] text-slate-500">
                        {selectedMilestone.period}
                      </p>
                      <h3 className="mt-1 text-[clamp(1rem,3vw,2.35rem)] font-black leading-tight sm:mt-2">{selectedMilestone.label}</h3>
                      <p className="mt-2 line-clamp-2 text-[clamp(0.68rem,1.4vw,1rem)] font-semibold leading-5 text-slate-700 sm:mt-3 sm:line-clamp-none sm:leading-7">
                        {selectedMilestone.body}
                      </p>
                    </div>
                    <div className={`h-14 w-14 rounded-lg bg-gradient-to-br sm:h-24 sm:w-24 ${selectedMilestone.accent}`} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { label: 'API', value: 'Spring Boot', icon: Server },
                      { label: 'Data', value: 'JPA + QueryDSL', icon: Database },
                      { label: 'Client', value: 'React Query', icon: Layers3 },
                    ].map((item) => {
                      const Icon = item.icon;

                      return (
                        <div key={item.label} className="rounded-lg border border-slate-950/10 bg-white/60 p-2 sm:p-3">
                          <Icon className="mb-1 h-4 w-4 text-emerald-700 sm:mb-3 sm:h-5 sm:w-5" aria-hidden />
                          <p className="text-[0.64rem] font-black uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                          <p className="mt-1 text-[clamp(0.58rem,1.4vw,0.95rem)] font-black">{item.value}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="min-h-0 rounded-lg border border-slate-950/10 bg-slate-950 p-3 text-white sm:p-4">
                    <div className="mb-2 flex items-center justify-between gap-3 sm:mb-4">
                      <div>
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-emerald-200/80">Study Output</p>
                        <h4 className="mt-1 text-base font-black sm:text-xl">학습과 프로젝트 기록</h4>
                      </div>
                      <BookOpen className="h-5 w-5 text-emerald-200 sm:h-6 sm:w-6" aria-hidden />
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      {(filteredEntries.length > 0 ? filteredEntries : entries).slice(0, 2).map((entry) => (
                        <div key={entry.id} className="rounded-lg bg-white/8 p-2 sm:p-3">
                          <div className="flex items-start justify-between gap-3">
                            <h5 className="text-xs font-black leading-snug sm:text-sm">{entry.title}</h5>
                            <span className="hidden shrink-0 text-[0.68rem] font-bold text-emerald-200 sm:block">{entry.learnedAt}</span>
                          </div>
                          <p className="mt-1 line-clamp-1 text-[0.68rem] leading-4 text-slate-300 sm:mt-2 sm:line-clamp-2 sm:text-xs sm:leading-5">{entry.description}</p>
                          <div className="mt-1 flex flex-wrap gap-1 sm:mt-2 sm:gap-1.5">
                            {entry.skills.slice(0, 4).map((skill) => (
                              <span key={skill} className="rounded bg-white/10 px-2 py-1 text-[0.64rem] font-bold text-slate-200">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <footer className="grid grid-cols-3 gap-2 border-t border-slate-950/15 pt-2 sm:gap-3 sm:pt-4">
                    {[
                      ['Focus', '문제 정의'],
                      ['Output', 'API/프로젝트'],
                      ['Review', '회고 기록'],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[0.64rem] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
                        <p className="mt-1 text-xs font-black sm:text-sm">{value}</p>
                      </div>
                    ))}
                  </footer>
                </section>
              </div>
            </article>
          </div>

          <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <form onSubmit={submitStudyEntry} className="rounded-lg border border-white/10 bg-[#101820]/95 p-6 shadow-xl shadow-black/20 sm:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-200/70">Study Log</p>
                  <h2 className="mt-2 text-2xl font-black text-white">학습 내용 등록</h2>
                </div>
                <span className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-300 text-slate-950">
                  <CalendarPlus className="h-5 w-5" aria-hidden />
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-slate-400">제목</span>
                  <input
                    required
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300/70 focus:ring-4 focus:ring-emerald-300/10"
                    placeholder="예: QueryDSL 동적 검색"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-400">분류</span>
                  <select
                    value={form.category}
                    onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value as StudyEntry['category'] }))}
                    className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-emerald-300/70 focus:ring-4 focus:ring-emerald-300/10"
                  >
                    <option value="EDUCATION">교육</option>
                    <option value="PROJECT">프로젝트</option>
                    <option value="CERTIFICATE">자격</option>
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-400">학습일</span>
                  <input
                    required
                    type="date"
                    value={form.learnedAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, learnedAt: event.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-emerald-300/70 focus:ring-4 focus:ring-emerald-300/10"
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-slate-400">기술</span>
                  <input
                    required
                    value={form.skills}
                    onChange={(event) => setForm((prev) => ({ ...prev, skills: event.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300/70 focus:ring-4 focus:ring-emerald-300/10"
                    placeholder="Java, Spring Boot, JPA"
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-slate-400">설명</span>
                  <textarea
                    required
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    className="min-h-24 w-full resize-y rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300/70 focus:ring-4 focus:ring-emerald-300/10"
                    placeholder="무엇을 공부했고 어떤 방식으로 적용했는지 적어주세요."
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-slate-400">느낀점</span>
                  <textarea
                    required
                    value={form.takeaway}
                    onChange={(event) => setForm((prev) => ({ ...prev, takeaway: event.target.value }))}
                    className="min-h-20 w-full resize-y rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300/70 focus:ring-4 focus:ring-emerald-300/10"
                    placeholder="이번 학습으로 얻은 역량이나 다음 개선점을 적어주세요."
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-300 px-5 py-3 text-base font-black text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createMutation.isPending ? '저장 중' : '등록하기'}
                <ArrowUpRight className="h-5 w-5" aria-hidden />
              </button>
              {createMutation.isError && (
                <p className="mt-3 text-sm font-bold text-red-300">저장에 실패했습니다. 백엔드 실행 상태를 확인해주세요.</p>
              )}
            </form>

            <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/20 backdrop-blur sm:p-7">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Learning Archive</p>
                  <h2 className="mt-2 text-2xl font-black text-white">교육 및 프로젝트</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setActiveCategory(value as typeof activeCategory)}
                      className={`rounded-lg border px-4 py-2 text-sm font-bold transition ${
                        activeCategory === value
                          ? 'border-emerald-300 bg-emerald-300 text-slate-950'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {isLoading && <p className="py-10 text-slate-400">학습 기록을 불러오는 중입니다.</p>}
              {isError && (
                <p className="mb-4 rounded-lg border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100">
                  백엔드 API에 연결되지 않아 예시 데이터를 표시합니다.
                </p>
              )}
              <div className="grid gap-4">
                {filteredEntries.map((entry) => {
                  const Icon = iconByCategory[entry.category];

                  return (
                    <article
                      key={entry.id}
                      className="group rounded-lg border border-white/10 bg-slate-950/45 p-5 transition hover:-translate-y-1 hover:border-white/20 hover:bg-slate-950/70"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="mb-2 text-sm font-bold text-emerald-200/80">{entry.learnedAt}</p>
                          <h3 className="text-xl font-black leading-snug text-white">{entry.title}</h3>
                        </div>
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/8 text-slate-200 transition group-hover:bg-emerald-300 group-hover:text-slate-950">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                      </div>
                      <p className="mt-4 leading-7 text-slate-300">{entry.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {entry.skills.map((skill) => (
                          <span key={skill} className="rounded-lg bg-white/8 px-3 py-1 text-sm font-bold text-slate-200">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </section>
        </section>
      </section>
    </main>
  );
}
