export type StudyCategory = 'EDUCATION' | 'PROJECT' | 'CERTIFICATE';

export type StudyEntry = {
  id: number;
  title: string;
  description: string;
  category: StudyCategory;
  skills: string[];
  takeaway: string;
  learnedAt: string;
};

export type CreateStudyEntryRequest = Omit<StudyEntry, 'id' | 'skills'> & {
  skills: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toString().toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  if (method !== 'GET') {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-XSRF-TOKEN'] = csrfToken;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API request failed: ${response.status}`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const studyApi = {
  list: (category?: string) => {
    const search = category && category !== 'ALL' ? `?category=${category}` : '';
    return request<StudyEntry[]>(`/api/study-entries${search}`);
  },
  create: (payload: CreateStudyEntryRequest) =>
    request<StudyEntry>('/api/study-entries', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        skills: payload.skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean),
      }),
    }),
  update: (id: number, payload: CreateStudyEntryRequest) =>
    request<StudyEntry>(`/api/study-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...payload,
        skills: payload.skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean),
      }),
    }),
  remove: (id: number) =>
    request<void>(`/api/study-entries/${id}`, {
      method: 'DELETE',
    }),
};

export const authApi = {
  login: (username: string, password: string) =>
    request<void>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () =>
    request<void>('/api/auth/logout', {
      method: 'POST',
    }),
  me: () => request<{ username: string }>('/api/auth/me'),
};
