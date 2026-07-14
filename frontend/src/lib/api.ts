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

export type Profile = {
  id: number;
  name: string;
  nameEn: string;
  jobTitle: string;
  bio: string;
  careerSummary: string;
  coreStackSummary: string;
  statusBadgeText: string;
  githubUrl: string;
  email: string;
  phone: string;
  updatedAt: string;
};

export type Skill = {
  id: number;
  name: string;
  category: string;
  skillLevel?: string;
  skillVersion?: string;
  comment?: string;
  usageType: 'LEARNING' | 'WORK_EXPERIENCE' | 'PROJECT_USE' | string;
  isCore: boolean;
  displayOrder: number;
};

export type ExperienceDetail = {
  id: number;
  content: string;
  situation?: string;
  actionDetail?: string;
  outcome?: string;
  displayOrder: number;
  skills: Skill[];
};

export type Experience = {
  id: number;
  type: 'CAREER' | 'PROJECT' | 'EDUCATION' | 'CERTIFICATE';
  title: string;
  periodStart: string;
  periodEnd?: string;
  summary?: string;
  takeaway?: string;
  essayContent?: string;
  displayOrder: number;
  details: ExperienceDetail[];
  skills: Skill[];

  // Career specific
  companyName?: string;
  employmentType?: string;
  department?: string;
  role?: string;

  // Project specific
  slug?: string;
  contributionRate?: number;

  // Education specific
  institutionName?: string;

  // Certificate specific
  issuer?: string;
};

export type IntroductionResponse = {
  profile: Profile | null;
  experiences: Experience[];
  skills: Skill[];
};

export type LearningResponse = {
  studyEntries: StudyEntry[];
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

export const bffApi = {
  getIntroduction: () => request<IntroductionResponse>('/api/bff/introduction'),
  getLearning: () => request<LearningResponse>('/api/bff/learning'),
};

export const profileApi = {
  update: (payload: Omit<Profile, 'id' | 'updatedAt'>) =>
    request<Profile>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};

export const skillApi = {
  list: () => request<Skill[]>('/api/skills'),
  create: (payload: Omit<Skill, 'id'>) =>
    request<Skill>('/api/skills', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: Omit<Skill, 'id'>) =>
    request<Skill>(`/api/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<void>(`/api/skills/${id}`, {
      method: 'DELETE',
    }),
};

export type ExperienceDetailRequest = {
  id?: number | null;
  content: string;
  situation?: string;
  actionDetail?: string;
  outcome?: string;
  skillIds: number[];
};

export type ExperienceRequest = {
  type: 'CAREER' | 'PROJECT' | 'EDUCATION' | 'CERTIFICATE';
  title: string;
  periodStart: string;
  periodEnd?: string | null;
  summary?: string;
  takeaway?: string;
  essayContent?: string;
  displayOrder: number;
  details: ExperienceDetailRequest[];
  skillIds: number[];
  companyName?: string;
  employmentType?: string;
  department?: string;
  role?: string;
  slug?: string;
  contributionRate?: number;
  institutionName?: string;
  issuer?: string;
};

export const experienceApi = {
  list: () => request<Experience[]>('/api/experiences'),
  create: (payload: ExperienceRequest) =>
    request<Experience>('/api/experiences', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: ExperienceRequest) =>
    request<Experience>(`/api/experiences/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<void>(`/api/experiences/${id}`, {
      method: 'DELETE',
    }),
};

