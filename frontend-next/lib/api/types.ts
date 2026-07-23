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
    experienceDetails: Array<{
        id: number;
        content: string;
        experienceId: number;
        experienceTitle: string;
    }>;
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
    task?: string;
    actionDetail?: string;
    outcome?: string;
    narrative?: string;
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
    | {
          type: 'evidence';
          groups: Array<{ theme: string; evidenceCount: number; studyCount: number }>;
      }
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

export type DonationEventType =
    'CREATED' | 'PAY_REQUESTED' | 'PAY_FAILED' | 'PAID' | 'CANCELED' | 'CALLBACK_REJECTED';

export type DonationEventActor = 'VISITOR' | 'SYSTEM' | 'PAYAPP' | 'KOFI' | 'ADMIN';

export type DonationConfigResponse = {
    enabled: boolean;
    kofiPageUrl?: string | null;
};

export type DonationEvent = {
    id: number;
    eventType: DonationEventType;
    actor: DonationEventActor;
    payState: string | null;
    detail: string | null;
    createdAt: string;
};

export type ExperienceDetailRequest = {
    id?: number | null;
    content: string;
    situation?: string;
    task?: string;
    actionDetail?: string;
    outcome?: string;
    narrative?: string;
    skillIds: number[];
};

export type ExperienceRequest = {
    type: 'CAREER' | 'PROJECT' | 'EDUCATION' | 'CERTIFICATE';
    title: string;
    periodStart: string;
    periodEnd?: string | null;
    summary?: string;
    takeaway?: string;
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
    task?: string;
    actionDetail: string;
    outcome: string;
    skillIds: number[];
};

export type ExperienceSuggestion = {
    summary: string;
    takeaway: string;
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

export type ExperienceDetailNarrativeRequest = {
    content: string;
    situation?: string;
    task?: string;
    actionDetail?: string;
    outcome?: string;
};

export type ExperienceDetailNarrativeResponse = {
    narrative: string;
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

/** 서버에서 반환되는 원본(JSON 문자열 필드 그대로) */
export type PrintTemplateRaw = {
    id: number;
    name: string;
    excludedIds: string; // JSON array string
    sectionOrder: string; // JSON array string
    sectionGaps: string; // JSON object string
    visible: boolean;
    displayOrder: number;
};

/** 프론트에서 사용하는 파싱된 형태 */
export type PrintTemplate = {
    id: number;
    name: string;
    excludedIds: string[];
    sectionOrder: string[];
    sectionGaps: Record<string, number>;
    visible: boolean;
    displayOrder: number;
};

export type PrintTemplateRequest = {
    name: string;
    excludedIds: string;
    sectionOrder: string;
    sectionGaps: string;
    visible: boolean;
    displayOrder: number;
};
