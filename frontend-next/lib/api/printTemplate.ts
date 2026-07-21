import { request } from './client';
import type { PrintTemplate, PrintTemplateRaw, PrintTemplateRequest } from './types';

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
    visible: raw.visible,
    displayOrder: raw.displayOrder,
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
  remove: (id: number) => request<void>(`/api/admin/print-templates/${id}`, { method: 'DELETE' }),
};
