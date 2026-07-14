import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Home, LogOut, Pencil, Plus, Trash2 } from 'lucide-react';
import { ApiError, studyApi, type CreateStudyEntryRequest, type StudyEntry } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

const emptyForm: CreateStudyEntryRequest = {
  title: '',
  description: '',
  category: 'PROJECT',
  skills: '',
  takeaway: '',
  learnedAt: new Date().toISOString().split('T')[0],
};

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);

  const { data: entries } = useQuery<StudyEntry[]>({
    queryKey: ['studyEntries'],
    queryFn: () => studyApi.list(),
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateStudyEntryRequest>(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleMutationError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      setUnauthenticated();
    }
  };

  const createMutation = useMutation({
    mutationFn: studyApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyEntries'] });
      setForm(emptyForm);
      setIsFormOpen(false);
    },
    onError: handleMutationError,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CreateStudyEntryRequest }) =>
      studyApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyEntries'] });
      setEditingId(null);
      setForm(emptyForm);
      setIsFormOpen(false);
    },
    onError: handleMutationError,
  });

  const deleteMutation = useMutation({
    mutationFn: studyApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyEntries'] });
    },
    onError: handleMutationError,
  });

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const startEdit = (entry: StudyEntry) => {
    setEditingId(entry.id);
    setForm({
      title: entry.title,
      description: entry.description,
      category: entry.category,
      skills: entry.skills.join(', '),
      takeaway: entry.takeaway,
      learnedAt: entry.learnedAt,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, payload: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-800">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl">
        <h1 className="text-sm font-black text-slate-800">관리자 대시보드 — 공부 정리</h1>
        <div className="flex items-center gap-2">
          <a
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            <Home className="h-3.5 w-3.5" />
            메인페이지로
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

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-500">{entries?.length ?? 0}개의 글</p>
          <button
            onClick={startCreate}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-indigo-500/20 transition hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            새 글 작성
          </button>
        </div>

        {isFormOpen && (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black text-slate-800">{editingId !== null ? '글 수정' : '새 글 작성'}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">제목</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">분류</label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as CreateStudyEntryRequest['category'] })
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
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                기술 스택 (쉼표 구분)
              </label>
              <input
                type="text"
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">상세 설명</label>
              <textarea
                required
                rows={5}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                핵심 Lesson Learned / Takeaway
              </label>
              <textarea
                required
                rows={3}
                value={form.takeaway}
                onChange={(e) => setForm({ ...form, takeaway: e.target.value })}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">학습일</label>
              <input
                type="date"
                required
                value={form.learnedAt}
                onChange={(e) => setForm({ ...form, learnedAt: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {editingId !== null ? '수정 완료' : '작성 완료'}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {entries?.map((entry) => (
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
                  onClick={() => startEdit(entry)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
