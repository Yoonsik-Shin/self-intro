import { request } from './client';
import type { IntroductionResponse } from './types';

export const bffApi = {
    getWorkspaceIntroduction: (workspaceSlug: string) =>
        request<IntroductionResponse>(
            `/api/bff/workspaces/${encodeURIComponent(workspaceSlug)}/introduction`
        ),
};
