'use client';

import { useEffect, useRef, useState } from 'react';
import {
    PublicDraftPreviewFrame,
    PublicDraftPreviewLoading,
} from '@/components/common/PublicDraftPreviewState';
import type { IntroductionResponse } from '@/lib/api/types';
import type { PublicExperiencePreview, PublicStudyPreview } from '@/lib/api/publicPage';
import { ExperienceListClient } from '@/components/experience/ExperienceListClient';
import { StudyListClient } from '@/components/study/StudyListClient';
import { IntroPageClient } from './IntroPageClient';

type LivePreviewSection = 'profile' | 'experience' | 'study';

type LivePreviewMessage = {
    type: 'live-preview-data';
    section: LivePreviewSection;
    workspaceSlug: string;
    message?: string;
    data: IntroductionResponse | PublicExperiencePreview | PublicStudyPreview;
};

function isLivePreviewMessage(value: unknown): value is LivePreviewMessage {
    return (
        typeof value === 'object' &&
        value !== null &&
        (value as { type?: unknown }).type === 'live-preview-data'
    );
}

/**
 * postMessage로 받은 미공개 초안 데이터를 렌더링만 한다.
 * iframe 자체 뷰포트 폭을 기준으로 반응형이 동작해야 하므로 fetch 없이 부모가 밀어주는 데이터만 그린다.
 */
export function WorkspaceLivePreviewClient() {
    const [payload, setPayload] = useState<LivePreviewMessage | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (!isLivePreviewMessage(event.data)) return;
            setPayload(event.data);
        };
        window.addEventListener('message', handleMessage);
        window.parent.postMessage({ type: 'live-preview-ready' }, window.location.origin);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // 부모에게 실제 문서 높이를 알려준다 — iframe이 문서보다 커서 빈 캔버스가
    // 남지 않도록. 펼치기/접기 등으로 높이가 바뀔 때도 ResizeObserver가 다시 보낸다.
    useEffect(() => {
        const node = rootRef.current;
        if (!node) return;
        const notifyHeight = () => {
            window.parent.postMessage(
                { type: 'live-preview-resize', height: node.scrollHeight },
                window.location.origin
            );
        };
        notifyHeight();
        const observer = new ResizeObserver(notifyHeight);
        observer.observe(node);
        return () => observer.disconnect();
    }, [payload]);

    if (!payload) {
        return (
            <PublicDraftPreviewLoading label="미리보기" message="미리보기를 불러오는 중입니다." />
        );
    }

    const { section, data, workspaceSlug, message } = payload;

    return (
        <div ref={rootRef}>
            <PublicDraftPreviewFrame message={message}>
                {section === 'profile' ? (
                    <IntroPageClient
                        introData={data as IntroductionResponse}
                        workspaceSlug={workspaceSlug}
                    />
                ) : section === 'experience' ? (
                    <div className="p-4">
                        <ExperienceListClient
                            experiences={[
                                ...(data as IntroductionResponse | PublicExperiencePreview)
                                    .experiences,
                            ].sort((a, b) => b.periodStart.localeCompare(a.periodStart))}
                            basePath={`/workspace/${encodeURIComponent(workspaceSlug)}/experience`}
                            previewMode
                        />
                    </div>
                ) : (
                    <div className="p-4">
                        <StudyListClient
                            initialStudies={(data as PublicStudyPreview).studies}
                            initialTotalElements={(data as PublicStudyPreview).studies.length}
                            initialTotalPages={Math.max(
                                1,
                                Math.ceil((data as PublicStudyPreview).studies.length / 20)
                            )}
                            taxonomyNodes={(data as PublicStudyPreview).taxonomy}
                            workspaceSlug={workspaceSlug}
                            previewMode
                        />
                    </div>
                )}
            </PublicDraftPreviewFrame>
        </div>
    );
}
