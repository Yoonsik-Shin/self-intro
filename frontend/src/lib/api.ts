export type StudyStatus = 'DRAFT' | 'PUBLISHED';
export type StudyRelationType = 'RELATED' | 'PREREQUISITE' | 'FOLLOW_UP' | 'APPLIED_TO';

export type ImageScope = 'STUDY_GALLERY' | 'EXPERIENCE_GALLERY' | 'STUDY_MARKDOWN';

export type GalleryImage = {
  id?: number;
  objectKey: string;
  url: string;
  displayOrder: number;
};

export type GalleryImageRequest = {
  id?: number | null;
  objectKey: string;
  displayOrder: number;
};

export type PresignedUploadResponse = {
  objectKey: string;
  uploadUrl: string;
  publicUrl: string;
};

export type StudyCategory = {
  id: number;
  name: string;
  slug: string;
  displayOrder: number;
};

export type Tag = {
  id: number;
  name: string;
  slug: string;
};

export type Study = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  contentMarkdown: string;
  status: StudyStatus;
  category: StudyCategory;
  tags: Tag[];
  skills: Skill[];
  experiences: Array<Pick<Experience, 'id' | 'type' | 'title'>>;
  experienceDetails: Array<{ id: number; content: string; experienceId: number; experienceTitle: string }>;
  relatedStudies: Array<Pick<Study, 'id' | 'slug' | 'title'> & { type: StudyRelationType }>;
  images: GalleryImage[];
  learnedAt: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudyRequest = {
  slug: string;
  title: string;
  summary: string;
  contentMarkdown: string;
  status: StudyStatus;
  categoryId: number;
  tagNames: string[];
  skillIds: number[];
  experienceIds: number[];
  experienceDetailIds: number[];
  relatedStudies: Array<{ studyId: number; type: StudyRelationType }>;
  images: GalleryImageRequest[];
  learnedAt: string;
  publishedAt?: string | null;
};

export type StudyPage = {
  content: Study[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type StudySuggestionRequest = {
  instruction: string;
  draftTitle: string;
  draftSummary: string;
  skillIds: number[];
  experienceIds: number[];
  experienceDetailIds: number[];
  relatedStudyIds: number[];
};

export type StudySuggestion = {
  title: string;
  summary: string;
  tagNames: string[];
  contentMarkdown: string;
  reason: string;
};

export type StudySuggestionResponse = {
  suggestions: StudySuggestion[];
};

export type StudySuggestionStreamEvent =
  | { type: 'stage'; stage: number; message: string }
  | { type: 'token'; stage: number; text: string }
  | { type: 'facts'; factCount: number }
  | { type: 'complete'; suggestions: StudySuggestion[] }
  | { type: 'error'; message: string };

export type Profile = {
  id: number;
  name: string;
  nameEn: string;
  jobTitle: string;
  bio: string;
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
  badgeKey?: string | null;
  badgeColor?: string | null;
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
  showOnTimeline: boolean;
  timelineLabel?: string;
  details: ExperienceDetail[];
  skills: Skill[];
  tags: Tag[];
  images: GalleryImage[];

  // Career specific
  companyName?: string;
  employmentType?: string;
  department?: string;
  role?: string;

  // Project specific
  slug?: string;
  contributionRate?: number;
  repositoryUrl?: string;
  careerId?: number;

  // Education specific
  institutionName?: string;

  // Certificate specific
  issuer?: string;
};

export type CompetencyEvidence = {
  id: number;
  experienceId: number;
  experienceType: 'CAREER' | 'PROJECT';
  experienceTitle: string;
  evidenceSummary?: string;
  primary: boolean;
  displayOrder: number;
};

export type CompetencyStudy = {
  id: number;
  slug: string;
  title: string;
  status: StudyStatus;
};

export type Competency = {
  id: number;
  title: string;
  summary: string;
  displayOrder: number;
  visible: boolean;
  skills: Skill[];
  evidences: CompetencyEvidence[];
  relatedStudies: CompetencyStudy[];
};

export type CompetencyRequest = {
  title: string;
  summary: string;
  displayOrder: number;
  visible: boolean;
  skillIds: number[];
  evidences: Array<{
    experienceId: number;
    evidenceSummary?: string;
    primary: boolean;
    displayOrder: number;
  }>;
  studyIds: number[];
};

export type CompetencySuggestionRequest = {
  instruction: string;
  draftTitle: string;
  draftSummary: string;
  skillIds: number[];
  experienceIds: number[];
  studyIds: number[];
};

export type CompetencySuggestion = {
  title: string;
  summary: string;
  skillIds: number[];
  evidences: Array<{
    experienceId: number;
    evidenceSummary: string;
    primary: boolean;
  }>;
  studyIds: number[];
  reason: string;
};

export type CompetencySuggestionResponse = {
  suggestions: CompetencySuggestion[];
};

export type CompetencySuggestionStreamEvent =
  | { type: 'stage'; stage: number; message: string }
  | { type: 'token'; stage: number; text: string }
  | { type: 'evidence'; groups: Array<{ theme: string; evidenceCount: number; studyCount: number }> }
  | { type: 'complete'; suggestions: CompetencySuggestion[] }
  | { type: 'error'; message: string };

export type IntroductionResponse = {
  profile: Profile | null;
  experiences: Experience[];
  coreProjects: Experience[];
  skills: Skill[];
  careerSummary: string;
  competencies: Competency[];
};

export type LearningResponse = {
  studies: Study[];
};

export type VisitorSummary = {
  todayVisitors: number;
  totalVisitors: number;
  totalPageViews: number;
  todayBotVisitors: number;
};

export type VisitorDaily = {
  date: string;
  visitors: number;
  pageViews: number;
};

export type VisitorHourly = {
  hour: number;
  visitors: number;
  pageViews: number;
};

export type SkillConnections = {
  studyIds: number[];
  experienceIds: number[];
  experienceDetailIds: number[];
};

export type ExperienceRelationType = 'RELATED' | 'PART_OF' | 'APPLIED_TO' | 'FOLLOW_UP';

export type ExperienceConnections = {
  studyIds: number[];
  detailStudies: Array<{ detailId: number; studyIds: number[] }>;
  relatedExperiences: Array<{ experienceId: number; type: ExperienceRelationType }>;
};

export type RelatedExperience = Pick<Experience, 'id' | 'type' | 'title'> & {
  relationType: ExperienceRelationType;
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
    throw await toApiError(response);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function toApiError(response: Response): Promise<ApiError> {
  const errorText = await response.text();
  let message = `API request failed: ${response.status}`;
  if (errorText) {
    try {
      const errorBody = JSON.parse(errorText) as { detail?: string; message?: string; error?: string };
      message = errorBody.detail ?? errorBody.message ?? errorBody.error ?? message;
    } catch {
      message = errorText;
    }
  }
  return new ApiError(response.status, message);
}

async function requestEventStream<TEvent>(
  path: string,
  payload: unknown,
  onEvent: (event: TEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-XSRF-TOKEN'] = csrfToken;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok || !response.body) {
    throw await toApiError(response);
  }

  const emit = (rawEvent: string) => {
    const data = rawEvent
      .split('\n')
      .map((line) => line.replace(/\r$/, ''))
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, ''))
      .join('\n');
    if (data) onEvent(JSON.parse(data) as TEvent);
  };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let separator = buffer.indexOf('\n\n');
    while (separator >= 0) {
      emit(buffer.slice(0, separator));
      buffer = buffer.slice(separator + 2);
      separator = buffer.indexOf('\n\n');
    }
  }
  if (buffer.trim()) emit(buffer);
}

export const studyApi = {
  list: (params: { q?: string; category?: string; skillIds?: number[]; experienceIds?: number[]; experienceDetailIds?: number[]; page?: number; size?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.category && params.category !== 'ALL') search.set('category', params.category);
    params.skillIds?.forEach((id) => search.append('skillIds', String(id)));
    params.experienceIds?.forEach((id) => search.append('experienceIds', String(id)));
    params.experienceDetailIds?.forEach((id) => search.append('experienceDetailIds', String(id)));
    search.set('page', String(params.page ?? 0));
    search.set('size', String(params.size ?? 20));
    return request<StudyPage>(`/api/studies?${search}`);
  },
  detail: (slug: string) => request<Study>(`/api/studies/${encodeURIComponent(slug)}`),
  adminList: (params: { q?: string; category?: string; status?: StudyStatus; skillIds?: number[]; experienceIds?: number[]; experienceDetailIds?: number[] } = {}) => {
    const search = new URLSearchParams({ size: '100' });
    if (params.q) search.set('q', params.q);
    if (params.category && params.category !== 'ALL') search.set('category', params.category);
    if (params.status) search.set('status', params.status);
    params.skillIds?.forEach((id) => search.append('skillIds', String(id)));
    params.experienceIds?.forEach((id) => search.append('experienceIds', String(id)));
    params.experienceDetailIds?.forEach((id) => search.append('experienceDetailIds', String(id)));
    return request<StudyPage>(`/api/admin/studies?${search}`);
  },
  categories: () => request<StudyCategory[]>('/api/study-categories'),
  tags: () => request<Tag[]>('/api/tags'),
  create: (payload: StudyRequest) =>
    request<Study>('/api/admin/studies', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: StudyRequest) =>
    request<Study>(`/api/admin/studies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<void>(`/api/admin/studies/${id}`, {
      method: 'DELETE',
    }),
  suggest: (payload: StudySuggestionRequest) =>
    request<StudySuggestionResponse>('/api/admin/studies/ai/suggestions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  suggestStream: (
    payload: StudySuggestionRequest,
    onEvent: (event: StudySuggestionStreamEvent) => void,
    signal?: AbortSignal,
  ) =>
    requestEventStream<StudySuggestionStreamEvent>(
      '/api/admin/studies/ai/suggestions/stream', payload, onEvent, signal),
};

export const imageApi = {
  requestPresignedUpload: (scope: ImageScope, fileName: string, contentType: string) =>
    request<PresignedUploadResponse>('/api/admin/images/presigned-upload', {
      method: 'POST',
      body: JSON.stringify({ scope, fileName, contentType }),
    }),
  // Uploads directly to object storage, not through the backend — no XSRF header, no
  // credentials, no API_BASE_URL prefix, since the presigned URL is a different origin.
  uploadToPresignedUrl: async (uploadUrl: string, file: File): Promise<void> => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
    if (!response.ok) {
      throw new ApiError(response.status, `이미지 업로드에 실패했습니다: ${response.status}`);
    }
  },
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

export const competencyApi = {
  list: () => request<Competency[]>('/api/admin/competencies'),
  create: (payload: CompetencyRequest) =>
    request<Competency>('/api/admin/competencies', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: CompetencyRequest) =>
    request<Competency>(`/api/admin/competencies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<void>(`/api/admin/competencies/${id}`, {
      method: 'DELETE',
    }),
  suggest: (payload: CompetencySuggestionRequest) =>
    request<CompetencySuggestionResponse>('/api/admin/competencies/ai/suggestions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  suggestStream: (
    payload: CompetencySuggestionRequest,
    onEvent: (event: CompetencySuggestionStreamEvent) => void,
    signal?: AbortSignal,
  ) =>
    requestEventStream<CompetencySuggestionStreamEvent>(
      '/api/admin/competencies/ai/suggestions/stream', payload, onEvent, signal),
};

export type DonationStatus = 'PENDING' | 'PAID' | 'CANCELED' | 'FAILED';

export type DonationCreateResponse = {
  donationToken: string;
  payUrl: string;
};

export type AdminDonation = {
  id: number;
  amount: number;
  message: string | null;
  status: DonationStatus;
  mulNo: string | null;
  createdAt: string;
  paidAt: string | null;
  canceledAt: string | null;
};

export type AdminDonationSummary = {
  paidTotal: number;
  paidCount: number;
  donations: AdminDonation[];
};

export const donationApi = {
  create: (amount: number, message?: string) =>
    request<DonationCreateResponse>('/api/donations', {
      method: 'POST',
      body: JSON.stringify({ amount, message: message || undefined }),
    }),
  status: (token: string) => request<{ status: DonationStatus }>(`/api/donations/${token}`),
  adminList: () => request<AdminDonationSummary>('/api/admin/donations'),
  adminCancel: (id: number) =>
    request<void>(`/api/admin/donations/${id}/cancel`, { method: 'POST' }),
};

export const visitorApi = {
  record: () => request<VisitorSummary>('/api/visits', { method: 'POST' }),
  adminSummary: () => request<VisitorSummary>('/api/admin/visits/summary'),
  adminDaily: (from?: string, to?: string) => {
    const search = new URLSearchParams();
    if (from) search.set('from', from);
    if (to) search.set('to', to);
    const query = search.toString();
    return request<VisitorDaily[]>(`/api/admin/visits/daily${query ? `?${query}` : ''}`);
  },
  adminHourly: (date?: string) =>
    request<VisitorHourly[]>(`/api/admin/visits/hourly${date ? `?date=${date}` : ''}`),
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
  showOnTimeline: boolean;
  timelineLabel?: string;
  details: ExperienceDetailRequest[];
  skillIds: number[];
  tagNames: string[];
  images: GalleryImageRequest[];
  companyName?: string;
  employmentType?: string;
  department?: string;
  role?: string;
  slug?: string;
  contributionRate?: number;
  repositoryUrl?: string;
  careerId?: number;
  institutionName?: string;
  issuer?: string;
};

export type ExperienceSuggestionRequest = {
  instruction: string;
  type: 'CAREER' | 'PROJECT' | 'EDUCATION' | 'CERTIFICATE';
  draftTitle: string;
  companyName?: string;
  role?: string;
  institutionName?: string;
  issuer?: string;
  repositoryUrl?: string;
  skillIds: number[];
  studyIds: number[];
  relatedExperienceIds: number[];
};

export type ExperienceDetailSuggestion = {
  content: string;
  situation: string;
  actionDetail: string;
  outcome: string;
  skillIds: number[];
};

export type ExperienceSuggestion = {
  summary: string;
  takeaway: string;
  essayContent: string;
  details: ExperienceDetailSuggestion[];
  reason: string;
};

export type ExperienceSuggestionResponse = {
  suggestions: ExperienceSuggestion[];
};

export type ExperienceSuggestionStreamEvent =
  | { type: 'stage'; stage: number; message: string }
  | { type: 'token'; stage: number; text: string }
  | { type: 'facts'; factCount: number }
  | { type: 'complete'; suggestions: ExperienceSuggestion[] }
  | { type: 'error'; message: string };

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
  suggest: (payload: ExperienceSuggestionRequest) =>
    request<ExperienceSuggestionResponse>('/api/admin/experiences/ai/suggestions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  suggestStream: (
    payload: ExperienceSuggestionRequest,
    onEvent: (event: ExperienceSuggestionStreamEvent) => void,
    signal?: AbortSignal,
  ) =>
    requestEventStream<ExperienceSuggestionStreamEvent>(
      '/api/admin/experiences/ai/suggestions/stream', payload, onEvent, signal),
};

export type ExperiencePlacement = {
  id: number;
  experienceId: number;
  placementType: 'CORE_PROJECT';
  displayOrder: number;
  enabled: boolean;
  detailIds: number[];
};

export type ExperiencePlacementRequest = {
  experienceId: number;
  displayOrder: number;
  enabled: boolean;
  detailIds: number[];
};

export const experiencePlacementApi = {
  listCoreProjects: () =>
    request<ExperiencePlacement[]>('/api/admin/experience-placements/CORE_PROJECT'),
  replaceCoreProjects: (payload: ExperiencePlacementRequest[]) =>
    request<ExperiencePlacement[]>('/api/admin/experience-placements/CORE_PROJECT', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};

export const connectionApi = {
  getSkill: (id: number) =>
    request<SkillConnections>(`/api/admin/skills/${id}/connections`),
  updateSkill: (id: number, payload: SkillConnections) =>
    request<SkillConnections>(`/api/admin/skills/${id}/connections`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getExperience: (id: number) =>
    request<ExperienceConnections>(`/api/admin/experiences/${id}/connections`),
  updateExperience: (id: number, payload: ExperienceConnections) =>
    request<ExperienceConnections>(`/api/admin/experiences/${id}/connections`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  relatedExperiences: (id: number) =>
    request<RelatedExperience[]>(`/api/experiences/${id}/related`),
};

export type ArchitectureOverview = {
  id: number;
  heading: string;
  subheading: string;
  diagramHeading: string;
  diagramText: string;
};

export type ArchitectureOverviewRequest = {
  heading: string;
  subheading: string;
  diagramHeading: string;
  diagramText: string;
};

export type ArchitectureLayerItem = {
  id: number;
  strongText?: string | null;
  bodyText: string;
  displayOrder: number;
};

export type ArchitectureLayer = {
  id: number;
  icon: string;
  title: string;
  displayOrder: number;
  visible: boolean;
  items: ArchitectureLayerItem[];
};

export type ArchitectureLayerRequest = {
  icon: string;
  title: string;
  displayOrder: number;
  visible: boolean;
  items: Array<{
    strongText?: string | null;
    bodyText: string;
  }>;
};

export const architectureApi = {
  getOverview: () => request<ArchitectureOverview>('/api/architecture/overview'),
  getLayers: () => request<ArchitectureLayer[]>('/api/architecture/layers'),
  adminListLayers: () => request<ArchitectureLayer[]>('/api/admin/architecture/layers'),
  updateOverview: (payload: ArchitectureOverviewRequest) =>
    request<ArchitectureOverview>('/api/admin/architecture/overview', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  createLayer: (payload: ArchitectureLayerRequest) =>
    request<ArchitectureLayer>('/api/admin/architecture/layers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateLayer: (id: number, payload: ArchitectureLayerRequest) =>
    request<ArchitectureLayer>(`/api/admin/architecture/layers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  removeLayer: (id: number) =>
    request<void>(`/api/admin/architecture/layers/${id}`, {
      method: 'DELETE',
    }),
};
