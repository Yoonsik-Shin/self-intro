import { request } from './client';
import type {
    IntroductionResponse,
    DirectPdfUploadRequest,
    PortfolioPrintTemplateRequest,
    PrintTemplate,
    PrintTemplateRaw,
    PrintTemplateRequest,
    PrintTemplateRevision,
} from './types';

function safeParseJson<T>(rawStr: string | null | undefined, fallback: T): T {
    if (!rawStr) return fallback;
    try {
        return JSON.parse(rawStr) as T;
    } catch {
        return fallback;
    }
}

function parsePrintTemplate(raw: PrintTemplateRaw): PrintTemplate {
    return {
        id: raw.id,
        name: raw.name,
        excludedIds: safeParseJson(raw.excludedIds, []),
        sectionOrder: safeParseJson(raw.sectionOrder, []),
        sectionGaps: safeParseJson(raw.sectionGaps, {}),
        targetRole: raw.targetRole || 'GENERAL',
        contentOverrides: safeParseJson(raw.contentOverrides, {}),
        baseContentFingerprint: raw.baseContentFingerprint,
        schemaVersion: raw.schemaVersion || 1,
        source: raw.source || 'MANUAL',
        generationMetadata: safeParseJson<Record<string, unknown> | null>(
            raw.generationMetadata,
            null
        ),
        generatedAt: raw.generatedAt,
        visible: raw.visible,
        displayOrder: raw.displayOrder,
        jobPostingId: raw.jobPostingId,
        documentType: raw.documentType,
        portfolioCaseStudyId: raw.portfolioCaseStudyId,
        orientation: raw.orientation,
        lineHeight: raw.lineHeight,
        isFinalSubmission: raw.isFinalSubmission,
        finalPdfUrl: raw.finalPdfUrl,
    };
}

export const printTemplateApi = {
    workspacePublicList: async (workspaceSlug: string) => {
        const raws = await request<PrintTemplateRaw[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/print-templates`
        );
        return raws.map(parsePrintTemplate);
    },
    workspaceAdminList: async (workspaceSlug: string) => {
        const raws = await request<PrintTemplateRaw[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/print-templates/manage`
        );
        return raws.map(parsePrintTemplate);
    },
    workspaceOutputSource: (workspaceSlug: string) =>
        request<IntroductionResponse>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/print-templates/manage/source`
        ),
    workspaceCreate: async (workspaceSlug: string, template: PrintTemplateRequest) => {
        const raw = await request<PrintTemplateRaw>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/print-templates/manage`,
            { method: 'POST', body: JSON.stringify(template) }
        );
        return parsePrintTemplate(raw);
    },
    workspaceUpdate: async (workspaceSlug: string, id: number, template: PrintTemplateRequest) => {
        const raw = await request<PrintTemplateRaw>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/print-templates/manage/${id}`,
            { method: 'PUT', body: JSON.stringify(template) }
        );
        return parsePrintTemplate(raw);
    },
    workspaceRemove: (workspaceSlug: string, id: number) =>
        request<void>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/print-templates/manage/${id}`,
            { method: 'DELETE' }
        ),
    workspaceListByPortfolioCaseStudy: async (workspaceSlug: string, caseStudyId: number) => {
        const raws = await request<PrintTemplateRaw[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/print-templates/manage/portfolio/${caseStudyId}`
        );
        return raws.map(parsePrintTemplate);
    },
    workspaceCreatePortfolio: async (
        workspaceSlug: string,
        caseStudyId: number,
        payload: PortfolioPrintTemplateRequest
    ) => {
        const raw = await request<PrintTemplateRaw>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/print-templates/manage/portfolio/${caseStudyId}`,
            { method: 'POST', body: JSON.stringify(payload) }
        );
        return parsePrintTemplate(raw);
    },
    workspaceUpdatePortfolio: async (
        workspaceSlug: string,
        caseStudyId: number,
        id: number,
        payload: PortfolioPrintTemplateRequest
    ) => {
        const raw = await request<PrintTemplateRaw>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/print-templates/manage/portfolio/${caseStudyId}/${id}`,
            { method: 'PUT', body: JSON.stringify(payload) }
        );
        return parsePrintTemplate(raw);
    },
    workspaceRevisions: (workspaceSlug: string, templateId: number) =>
        request<PrintTemplateRevision[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/print-templates/manage/${templateId}/revisions`
        ),
    workspaceRollbackRevision: async (
        workspaceSlug: string,
        templateId: number,
        revisionId: number
    ) => {
        const raw = await request<PrintTemplateRaw>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/print-templates/manage/${templateId}/revisions/${revisionId}/rollback`,
            { method: 'POST' }
        );
        return parsePrintTemplate(raw);
    },
    workspaceListByJobPosting: async (workspaceSlug: string, jobPostingId: number) => {
        const raws = await request<PrintTemplateRaw[]>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/print-templates/manage/job-applications/${jobPostingId}`
        );
        return raws.map(parsePrintTemplate);
    },
    workspaceCreateDirectPdf: async (
        workspaceSlug: string,
        jobPostingId: number,
        payload: DirectPdfUploadRequest
    ) => {
        const raw = await request<PrintTemplateRaw>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/print-templates/manage/job-applications/${jobPostingId}/direct-pdf`,
            { method: 'POST', body: JSON.stringify(payload) }
        );
        return parsePrintTemplate(raw);
    },
    workspaceMarkFinal: async (workspaceSlug: string, jobPostingId: number, id: number) => {
        const raw = await request<PrintTemplateRaw>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/print-templates/manage/job-applications/${jobPostingId}/${id}/mark-final`,
            { method: 'PATCH' }
        );
        return parsePrintTemplate(raw);
    },
    workspaceUnmarkFinal: async (workspaceSlug: string, jobPostingId: number, id: number) => {
        const raw = await request<PrintTemplateRaw>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/print-templates/manage/job-applications/${jobPostingId}/${id}/unmark-final`,
            { method: 'PATCH' }
        );
        return parsePrintTemplate(raw);
    },
    workspaceAttachFinalPdf: async (
        workspaceSlug: string,
        jobPostingId: number,
        id: number,
        objectKey: string
    ) => {
        const raw = await request<PrintTemplateRaw>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/print-templates/manage/job-applications/${jobPostingId}/${id}/final-pdf`,
            { method: 'PUT', body: JSON.stringify({ objectKey }) }
        );
        return parsePrintTemplate(raw);
    },
    workspaceRemoveFinalPdf: async (workspaceSlug: string, jobPostingId: number, id: number) => {
        const raw = await request<PrintTemplateRaw>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/print-templates/manage/job-applications/${jobPostingId}/${id}/final-pdf`,
            { method: 'DELETE' }
        );
        return parsePrintTemplate(raw);
    },
};
