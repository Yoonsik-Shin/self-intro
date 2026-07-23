'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { IntroductionResponse } from '@/lib/api/types';
import { printTemplateApi } from '@/lib/api';
import { PrintCanvas } from './PrintCanvas';

export function PrintPageClient({
    introData,
    adminMode,
    templateId,
}: {
    introData: IntroductionResponse;
    adminMode: boolean;
    templateId: number | null;
}) {
    const router = useRouter();
    const { data: templates = [], isLoading } = useQuery({
        queryKey: ['printTemplates', adminMode ? 'admin' : 'public', 'print-page'],
        queryFn: adminMode ? printTemplateApi.adminList : printTemplateApi.list,
        enabled: templateId != null,
    });
    const initialTemplate = templateId == null ? null : templates.find((t) => t.id === templateId);

    if (templateId != null && isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-900 text-sm font-bold text-slate-300">
                템플릿을 불러오는 중입니다.
            </div>
        );
    }

    if (templateId != null && !initialTemplate) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-900 text-sm font-bold text-rose-300">
                템플릿을 찾을 수 없거나 접근 권한이 없습니다.
            </div>
        );
    }

    return (
        <PrintCanvas
            key={initialTemplate?.id ?? 'manual'}
            introData={introData}
            adminMode={adminMode}
            initialTemplate={initialTemplate}
            onExit={() => router.push(adminMode ? '/admin' : '/')}
        />
    );
}
