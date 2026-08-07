import { request } from './client';
import type {
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
    list: async () => {
        const raws = await request<PrintTemplateRaw[]>('/api/print-templates');
        return raws.map(parsePrintTemplate);
    },
    adminList: async () => {
        const raws = await request<PrintTemplateRaw[]>('/api/admin/print-templates');
        return raws.map(parsePrintTemplate);
    },
    listByJobPosting: async (jobPostingId: number) => {
        const raws = await request<PrintTemplateRaw[]>(
            `/api/admin/print-templates?jobPostingId=${jobPostingId}`
        );
        return raws.map(parsePrintTemplate);
    },
    create: async (t: PrintTemplateRequest) => {
        const raw = await request<PrintTemplateRaw>('/api/admin/print-templates', {
            method: 'POST',
            body: JSON.stringify(t),
        });
        return parsePrintTemplate(raw);
    },
    update: async (id: number, t: PrintTemplateRequest) => {
        const raw = await request<PrintTemplateRaw>(`/api/admin/print-templates/${id}`, {
            method: 'PUT',
            body: JSON.stringify(t),
        });
        return parsePrintTemplate(raw);
    },
    markFinal: async (id: number) => {
        const raw = await request<PrintTemplateRaw>(`/api/admin/print-templates/${id}/mark-final`, {
            method: 'PATCH',
        });
        return parsePrintTemplate(raw);
    },
    unmarkFinal: async (id: number) => {
        const raw = await request<PrintTemplateRaw>(
            `/api/admin/print-templates/${id}/unmark-final`,
            { method: 'PATCH' }
        );
        return parsePrintTemplate(raw);
    },
    remove: (id: number) => request<void>(`/api/admin/print-templates/${id}`, { method: 'DELETE' }),
    attachFinalPdf: async (id: number, objectKey: string) => {
        const raw = await request<PrintTemplateRaw>(`/api/admin/print-templates/${id}/final-pdf`, {
            method: 'PUT',
            body: JSON.stringify({ objectKey }),
        });
        return parsePrintTemplate(raw);
    },
    removeFinalPdf: async (id: number) => {
        const raw = await request<PrintTemplateRaw>(`/api/admin/print-templates/${id}/final-pdf`, {
            method: 'DELETE',
        });
        return parsePrintTemplate(raw);
    },
    createDirectPdf: async (jobPostingId: number, payload: DirectPdfUploadRequest) => {
        const raw = await request<PrintTemplateRaw>(
            `/api/admin/job-postings/${jobPostingId}/direct-pdf`,
            {
                method: 'POST',
                body: JSON.stringify(payload),
            }
        );
        return parsePrintTemplate(raw);
    },
    listByPortfolioCaseStudy: async (caseStudyId: number) => {
        const raws = await request<PrintTemplateRaw[]>(
            `/api/admin/print-templates/portfolio/${caseStudyId}`
        );
        return raws.map(parsePrintTemplate);
    },
    getPortfolioDefault: async (caseStudyId: number, orientation: 'PORTRAIT' | 'LANDSCAPE') => {
        const raw = await request<PrintTemplateRaw>(
            `/api/admin/print-templates/portfolio/${caseStudyId}/default?orientation=${orientation}`
        );
        return parsePrintTemplate(raw);
    },
    createPortfolio: async (caseStudyId: number, payload: PortfolioPrintTemplateRequest) => {
        const raw = await request<PrintTemplateRaw>(
            `/api/admin/print-templates/portfolio/${caseStudyId}`,
            { method: 'POST', body: JSON.stringify(payload) }
        );
        return parsePrintTemplate(raw);
    },
    updatePortfolio: async (
        caseStudyId: number,
        id: number,
        payload: PortfolioPrintTemplateRequest
    ) => {
        const raw = await request<PrintTemplateRaw>(
            `/api/admin/print-templates/portfolio/${caseStudyId}/${id}`,
            { method: 'PUT', body: JSON.stringify(payload) }
        );
        return parsePrintTemplate(raw);
    },
    revisions: (templateId: number) =>
        request<PrintTemplateRevision[]>(`/api/admin/print-templates/${templateId}/revisions`),
};
