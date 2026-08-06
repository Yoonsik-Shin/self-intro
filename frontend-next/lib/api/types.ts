export type StudyStatus = 'DRAFT' | 'PUBLISHED';
export type StudyRelationType = 'RELATED' | 'PREREQUISITE' | 'FOLLOW_UP' | 'APPLIED_TO';

export type ImageScope =
    | 'STUDY_GALLERY'
    | 'EXPERIENCE_GALLERY'
    | 'STUDY_MARKDOWN'
    | 'PRINT_TEMPLATE_FINAL_PDF'
    | 'PORTFOLIO_ARCHITECTURE'
    | 'JOB_POSTING_SCREENSHOT';

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

export type TaxonomyNode = {
    id: number;
    name: string;
    slug: string;
    displayOrder: number;
    parentId: number | null;
};

export type TaxonomyNodeRequest = {
    name: string;
    slug: string;
    displayOrder: number;
    parentId: number | null;
};

export type StudyTaxonomyNode = TaxonomyNode & {
    studyCount: number;
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
    taxonomyNodes: TaxonomyNode[];
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
    taxonomyNodeIds: number[];
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

export type LearningResourceType = 'ONLINE_COURSE' | 'BOOK' | 'OFFLINE';
export type LearningResourceStatus = 'WISHLIST' | 'OWNED' | 'IN_PROGRESS' | 'COMPLETED';
export type LearningResourcePriorityTier = 'P0' | 'P1' | 'P2' | 'P3';
export type LearningResourceRelationType = 'PREREQUISITE' | 'RELATED' | 'FOLLOW_UP' | 'OVERLAPS';

export type LearningResource = {
    id: number;
    slug: string;
    title: string;
    resourceType: LearningResourceType;
    provider?: string;
    url?: string;
    instructorOrAuthor?: string;
    durationMinutes?: number;
    status: LearningResourceStatus;
    priorityTier?: LearningResourcePriorityTier;
    displayOrder: number;
    taxonomyNodes: TaxonomyNode[];
    summary?: string;
    detailMarkdown?: string;
    tags: Tag[];
    skills: Skill[];
    relatedResources: Array<
        Pick<LearningResource, 'id' | 'slug' | 'title'> & { type: LearningResourceRelationType }
    >;
    createdAt: string;
    updatedAt: string;
};

export type LearningResourceRequest = {
    slug?: string;
    title: string;
    resourceType: LearningResourceType;
    provider?: string;
    url?: string;
    instructorOrAuthor?: string;
    durationMinutes?: number | null;
    status: LearningResourceStatus;
    priorityTier?: LearningResourcePriorityTier | null;
    displayOrder: number;
    taxonomyNodeIds: number[];
    summary?: string;
    detailMarkdown?: string;
    tagNames: string[];
    skillIds: number[];
    relatedResources: Array<{ resourceId: number; type: LearningResourceRelationType }>;
};

export type LearningResourcePage = {
    content: LearningResource[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
};

export type LearningResourceGraphNode = {
    id: number;
    title: string;
    taxonomyNodes: TaxonomyNode[];
    resourceType: LearningResourceType;
    status: LearningResourceStatus;
    priorityTier?: LearningResourcePriorityTier;
    durationMinutes?: number;
};

export type LearningResourceGraphEdge = {
    sourceId: number;
    targetId: number;
    type: LearningResourceRelationType;
};

export type LearningResourceGraph = {
    nodes: LearningResourceGraphNode[];
    edges: LearningResourceGraphEdge[];
};

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
    visible?: boolean;
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

export type AdminDonation = {
    id: number;
    amount: number;
    currency: string;
    message: string | null;
    status: DonationStatus;
    mulNo: string | null;
    subscription: boolean;
    createdAt: string;
    paidAt: string | null;
    providerPaidAt: string | null;
    canceledAt: string | null;
};

export type AdminDonationCurrencyTotal = {
    currency: string;
    total: number;
    count: number;
};

export type AdminDonationSummary = {
    paidTotals: AdminDonationCurrencyTotal[];
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

export type JobPostingStatus =
    | 'NEW'
    | 'SAVED'
    | 'DISMISSED'
    | 'EXPIRED'
    | 'APPLIED'
    | 'CODING_TEST'
    | 'ASSIGNMENT'
    | 'APTITUDE_TEST'
    | 'INTERVIEW_1'
    | 'INTERVIEW_2'
    | 'FINAL_INTERVIEW'
    | 'OFFER'
    | 'REJECTED'
    | 'WITHDRAWN';

export type JobPostingSource = 'URL_INGEST' | 'SARAMIN' | 'MANUAL' | 'IMAGE_INGEST';

export type JobPostingPlatform = 'WANTED' | 'JOBKOREA' | 'SARAMIN' | 'GREETINGHR' | 'OTHER';

/** 회사+직무가 같아 병합된 공고에 등록된 URL 하나. "원본 보기" 팝오버가 이 목록을 그대로 나열한다. */
export type JobPostingSourceUrl = {
    id: number;
    url: string;
    platform: JobPostingPlatform;
    primary: boolean;
};

/** 여러 직무가 나열된 공고의 2지망 이상. 1지망은 positionTitle 자신이 담당한다. */
export type JobPostingPositionChoice = {
    id: number;
    rank: number;
    positionTitle: string;
};

/** PUT /{id}/position-choices 요청 항목. rank는 2 이상만 받는다. */
export type JobPostingPositionChoiceRequest = {
    rank: number;
    positionTitle: string;
};

/** JD 스크린샷으로 등록된 공고의 원본 이미지. "원본 이미지 보기"가 그대로 나열한다. */
export type JobPostingSourceImage = {
    id: number;
    url: string;
    displayOrder: number;
};

/** 채용 공고 하나를 발견(수집)부터 지원 결과까지 하나로 추적한다. status가 NEW~EXPIRED이면 아직
 * 지원 전(수집 후보), APPLIED 이상이면 지원 완료 단계다. */
export type JobPosting = {
    id: number;
    companyName: string;
    positionTitle: string;
    postingUrl: string | null;
    sourceUrls: JobPostingSourceUrl[];
    positionChoices: JobPostingPositionChoice[];
    sourceImages: JobPostingSourceImage[];
    externalId: string | null;
    collectionMethod: JobPostingSource;
    source: string;
    status: JobPostingStatus;
    appliedAt: string | null;
    deadline: string | null;
    alwaysOpen: boolean;
    salaryNote: string | null;
    location: string | null;
    latitude?: number | null;
    longitude?: number | null;
    employmentType: string | null;
    memo: string | null;
    jobDescription: string | null;
    requiredQualifications: string | null;
    preferredQualifications: string | null;
    hiringProcess: string | null;
    applicationMethod: string | null;
    compensationDetail: string | null;
    matchScore: number | null;
    matchReason: string | null;
    appealAnalysis: string | null;
    appealAnalyzedAt: string | null;
    jobplanetRating: number | null;
    jobplanetReviewCount: number | null;
    jobplanetCompanyName: string | null;
    jobplanetCompanyUrl: string | null;
    jobplanetCheckedAt: string | null;
    statusChangedAt: string;
    createdAt: string;
    updatedAt: string;
};

export type JobPostingRequest = {
    companyName: string;
    positionTitle: string;
    postingUrl?: string | null;
    source: string;
    appliedAt?: string | null;
    deadline?: string | null;
    alwaysOpen: boolean;
    salaryNote?: string | null;
    location?: string | null;
    employmentType?: string | null;
    memo?: string | null;
    jobDescription?: string | null;
    requiredQualifications?: string | null;
    preferredQualifications?: string | null;
    hiringProcess?: string | null;
    applicationMethod?: string | null;
    compensationDetail?: string | null;
};

export type JobPostingStatusEvent = {
    id: number;
    status: JobPostingStatus;
    memo: string | null;
    changedAt: string;
};

export type JobPostingCoverLetterItem = {
    id: number;
    question: string;
    answer: string;
    characterLimit: number | null;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
};

export type JobPostingCoverLetterItemRequest = {
    question: string;
    answer: string;
    characterLimit: number | null;
};

export type JobPostingCoverLetterDraftRequest = {
    question: string;
    characterLimit?: number | null;
    currentDraft?: string | null;
    feedbackInstruction?: string | null;
    coverLetterItemId?: number | null;
};

export type JobPostingCoverLetterDraftResponse = {
    question: string;
    draftAnswer: string;
    characterLimit?: number | null;
};

export type JobPostingCoverLetterRevision = {
    id: number;
    coverLetterItemId: number;
    senderType: 'USER' | 'AI';
    content: string;
    createdAt: string;
};

export type JobApplicationUrlParseResponse = {
    companyName: string | null;
    positionTitle: string | null;
    source: string | null;
    deadline: string | null;
    alwaysOpen: boolean;
    salaryNote: string | null;
    jobDescription: string | null;
    requiredQualifications: string | null;
    preferredQualifications: string | null;
    hiringProcess: string | null;
    applicationMethod: string | null;
    compensationDetail: string | null;
    postingUrl: string;
    /** positionTitle(1지망)을 제외한 나머지 모집부문. 한 페이지에 여러 직무가 나열된 경우에만 채워진다. */
    additionalPositionTitles: string[];
};

export type JobApplicationUrlParseStreamEvent =
    | { type: 'complete'; response: JobApplicationUrlParseResponse }
    | { type: 'error'; message: string };

export type JobPostingCollectionResult = {
    saraminEnabled: boolean;
    saraminCollected: number;
    expiredCount: number;
};

export type JobPostingIngestStreamEvent =
    | {
          type: 'complete';
          response: JobPosting;
          /** 자동 감지된 나머지 모집부문(1지망 제외). 자동 저장되지 않아 빈 배열이면 지망 선택 UI를 띄우지 않는다. */
          detectedAdditionalPositionTitles: string[];
      }
    | { type: 'error'; message: string };

export type JobPostingBulkIngestStreamEvent =
    | { type: 'progress'; total: number; current: number; label: string; status: string }
    | { type: 'item_success'; total: number; current: number; label: string; response: JobPosting }
    | { type: 'item_error'; total: number; current: number; label: string; message: string }
    | { type: 'complete'; total: number; successCount: number; errorCount: number }
    | { type: 'error'; message: string };

export type JobPostingBulkIngestRow = {
    url: string;
    images: { objectKey: string; url: string; contentType: string }[];
};

export type JobPostingSetting = {
    saraminEnabled: boolean;
    searchKeywords: string | null;
    searchCount: number;
    searchSort: string;
    locationCode: string | null;
    jobCode: string | null;
    industryCode: string | null;
    collectorScheduledEnabled: boolean;
    matchingKeywordThreshold: number;
    collectorCron: string;
    homeAddress?: string | null;
    homeLatitude?: number | null;
    homeLongitude?: number | null;
};

export type JobPostingSettingRequest = {
    saraminEnabled: boolean;
    searchKeywords?: string | null;
    searchCount: number;
    searchSort: string;
    locationCode?: string | null;
    jobCode?: string | null;
    industryCode?: string | null;
    collectorScheduledEnabled: boolean;
    matchingKeywordThreshold: number;
    collectorCron: string;
    homeAddress?: string | null;
    homeLatitude?: number | null;
    homeLongitude?: number | null;
};

export type ExperienceDetailRequest = {
    id?: number | null;
    content: string;
    situation?: string;
    task?: string;
    actionDetail?: string;
    outcome?: string;
    narrative?: string;
    visible?: boolean;
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
    targetRole: string;
    contentOverrides: string; // JSON object string
    baseContentFingerprint?: string | null;
    schemaVersion: number;
    source: 'MANUAL' | 'AI' | 'EXTERNAL' | string;
    generationMetadata: string | null;
    generatedAt: string | null;
    visible: boolean;
    displayOrder: number;
    jobPostingId: number | null;
    documentType: 'RESUME' | 'PORTFOLIO';
    portfolioCaseStudyId: number | null;
    orientation: 'PORTRAIT' | 'LANDSCAPE';
    isFinalSubmission: boolean;
    finalPdfUrl: string | null;
};

export type PrintTemplateContentOverrides = {
    profile?: Partial<Pick<Profile, 'jobTitle' | 'bio' | 'coreStackSummary'>>;
    experiences?: Record<
        string,
        Partial<Pick<Experience, 'title' | 'summary' | 'takeaway' | 'role'>>
    >;
    details?: Record<
        string,
        Partial<
            Pick<
                ExperienceDetail,
                'content' | 'situation' | 'task' | 'actionDetail' | 'outcome' | 'narrative'
            >
        >
    >;
    competencies?: Record<string, Partial<{ title: string; summary: string }>>;
    selectedSkillIds?: number[] | null;
};

/** 프론트에서 사용하는 파싱된 형태 */
export type PrintTemplate = {
    id: number;
    name: string;
    excludedIds: string[];
    sectionOrder: string[];
    sectionGaps: Record<string, number>;
    targetRole: string;
    contentOverrides: PrintTemplateContentOverrides;
    baseContentFingerprint?: string | null;
    schemaVersion: number;
    source: 'MANUAL' | 'AI' | 'EXTERNAL' | string;
    generationMetadata: Record<string, unknown> | null;
    generatedAt: string | null;
    visible: boolean;
    displayOrder: number;
    jobPostingId: number | null;
    documentType: 'RESUME' | 'PORTFOLIO';
    portfolioCaseStudyId: number | null;
    orientation: 'PORTRAIT' | 'LANDSCAPE';
    isFinalSubmission: boolean;
    finalPdfUrl: string | null;
};

export type JobPostingPrintDraftDecision = {
    itemType: string;
    itemId: string;
    decision: 'INCLUDE' | 'EXCLUDE' | string;
    reason: string;
};

export type JobPostingPrintDraftResponse = {
    templateId: number;
    templateName: string;
    strategySummary: string;
    targetRole: string;
    includedCount: number;
    excludedCount: number;
    decisions: JobPostingPrintDraftDecision[];
    warnings: string[];
};

export type JobplanetLookup = {
    jobPostingId: number;
    companyName: string;
    searchUrl: string;
    rating: number | null;
    reviewCount: number | null;
    jobplanetCompanyName: string | null;
    companyUrl: string | null;
    checkedAt: string | null;
};

export type JobplanetCompanyRequest = {
    rating: number;
    reviewCount: number | null;
    companyName: string;
    companyUrl: string;
};

export type GapProjectDocument = {
    id: number;
    jobPostingId: number;
    version: number;
    title: string;
    gapSnapshot: string;
    contentJson: string;
    renderedMarkdown: string;
    status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED' | string;
    sourceAppealAnalyzedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export type PrintTemplateRequest = {
    name: string;
    excludedIds: string;
    sectionOrder: string;
    sectionGaps: string;
    targetRole: string;
    contentOverrides: string;
    baseContentFingerprint?: string | null;
    schemaVersion: number;
    visible: boolean;
    displayOrder: number;
    jobPostingId: number | null;
};

export type PortfolioPrintTemplateRequest = {
    name: string;
    orientation: 'PORTRAIT' | 'LANDSCAPE';
    excludedIds: string;
    sectionOrder: string;
    sectionGaps: string;
    contentOverrides: string;
    isDefault: boolean;
};

export type DirectPdfUploadRequest = {
    name?: string;
    objectKey: string;
};

export type StudyPlanStatus = 'COLLECTING' | 'DRAFT' | 'CONFIRMED';
export type StudyPlanMessageRole = 'USER' | 'ASSISTANT';

export type StudyPlanCandidate = {
    id: number;
    title: string;
    category: string;
    resourceType: string;
    priorityTier: string | null;
    durationMinutes: number | null;
    selected: boolean;
    familiar: boolean;
};

export type StudyPlanCheckQuestion = {
    id: number;
    question: string;
    modelAnswerHint: string | null;
};

export type StudyPlanItem = {
    id: number;
    learningResourceId: number | null;
    resourceTitle: string | null;
    freeTextLabel: string | null;
    allocatedMinutes: number;
    completed: boolean;
    completedAt: string | null;
    understandingChecked: boolean;
    understandingCheckedAt: string | null;
    notes: string | null;
    checkQuestions: StudyPlanCheckQuestion[];
};

export type StudyPlanStage = {
    id: number;
    stageOrder: number;
    theme: string;
    totalMinutes: number;
    estimatedDurationLabel: string;
    items: StudyPlanItem[];
};

export type StudyPlanMessage = {
    id: number;
    role: StudyPlanMessageRole;
    content: string;
    createdAt: string;
};

export type StudyPlan = {
    id: number;
    status: StudyPlanStatus;
    weeklyAvailableMinutes: number;
    focusGoal: string | null;
    candidates: StudyPlanCandidate[];
    stages: StudyPlanStage[];
    messages: StudyPlanMessage[];
    createdAt: string;
    updatedAt: string;
    confirmedAt: string | null;
};

export type StudyPlanSummary = {
    id: number;
    status: StudyPlanStatus;
    focusGoal: string | null;
    createdAt: string;
    confirmedAt: string | null;
};

export type StudyPlanCreateRequest = {
    weeklyAvailableMinutes: number;
    focusGoal?: string | null;
};

export type PortfolioCaseStudyStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type PortfolioCaseStudyRevisionSource = 'AI' | 'MANUAL';

export type PortfolioCaseStudyTradeoff = {
    option: string;
    pros: string;
    cons: string;
    chosenBecause: string;
};

export type PortfolioCaseStudyOutcomeMetric = {
    label: string;
    before: string;
    after: string;
};

export type PortfolioCaseStudyOutcome = {
    summary: string;
    metrics: PortfolioCaseStudyOutcomeMetric[];
};

export type PortfolioCaseStudyArchitecture = {
    mermaidSource: string | null;
    imageObjectKeys: string[];
    /** 응답에만 채워지는 해석된 공개 URL(objectKey와 순서 대응). 저장/생성 요청 시에는 무시된다. */
    imageUrls: string[];
};

export type PortfolioCaseStudyContent = {
    summary: string;
    problem: string;
    thoughtProcess: string;
    tradeoffs: PortfolioCaseStudyTradeoff[];
    solution: string;
    outcome: PortfolioCaseStudyOutcome;
    architecture: PortfolioCaseStudyArchitecture;
    sourceStudyIds: number[];
    sourceExperienceDetailIds: number[];
};

export type PortfolioCaseStudy = {
    id: number;
    experienceId: number;
    slug: string;
    title: string;
    status: PortfolioCaseStudyStatus;
    publishedRevisionId: number | null;
    createdAt: string;
    updatedAt: string;
};

export type PortfolioCaseStudyRevision = {
    id: number;
    caseStudyId: number;
    version: number;
    source: PortfolioCaseStudyRevisionSource;
    content: PortfolioCaseStudyContent;
    renderedMarkdown: string;
    createdAt: string;
};

export type PortfolioCaseStudyDetail = {
    caseStudy: PortfolioCaseStudy;
    revisions: PortfolioCaseStudyRevision[];
};

export type PortfolioCaseStudyCreateRequest = {
    experienceId: number;
    slug: string;
    title: string;
};

export type PortfolioCaseStudyGenerateRequest = {
    instruction: string;
    studyIds: number[];
    skillIds: number[];
};

export type PortfolioCaseStudyGenerateStreamEvent =
    | { type: 'stage'; stage: number; message: string }
    | { type: 'token'; stage: number; text: string }
    | { type: 'facts'; factCount: number }
    | { type: 'complete'; content: PortfolioCaseStudyContent }
    | { type: 'error'; message: string };

export type PortfolioCaseStudyPublicSummary = {
    id: number;
    slug: string;
    title: string;
    summary: string;
    updatedAt: string;
};

export type PortfolioCaseStudyPublic = {
    id: number;
    slug: string;
    title: string;
    experienceId: number;
    content: PortfolioCaseStudyContent;
    renderedMarkdown: string;
    updatedAt: string;
};
