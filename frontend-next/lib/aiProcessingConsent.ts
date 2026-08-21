export const AI_PROCESSING_POLICY_VERSION = '2026-08-21';
export const AI_PROCESSING_CONSENT_STORAGE_KEY = 'self-intro:ai-processing-consent-version';
export const AI_PROCESSING_CONSENT_REQUIRED_EVENT = 'self-intro:ai-consent-required';

export function getAiProcessingConsentVersion(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(AI_PROCESSING_CONSENT_STORAGE_KEY);
}

export function acceptAiProcessingConsent() {
    window.localStorage.setItem(AI_PROCESSING_CONSENT_STORAGE_KEY, AI_PROCESSING_POLICY_VERSION);
}

export function isWorkspaceAiProcessingPath(path: string): boolean {
    if (!path.startsWith('/api/workspaces/')) return false;
    return (
        path.includes('/experiences/manage/ai/') ||
        path.includes('/studies/manage/ai/') ||
        path.includes('/competencies/ai/') ||
        (path.includes('/portfolio/case-studies/manage/') &&
            (path.includes('/revisions/generate') || path.includes('/print-draft'))) ||
        (path.includes('/portfolio-documents/') && path.includes('/revise/stream')) ||
        path.includes('/job-applications/manage/')
    );
}
