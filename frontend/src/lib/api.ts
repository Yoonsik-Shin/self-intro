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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
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
};
