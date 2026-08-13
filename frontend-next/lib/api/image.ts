import { request, ApiError } from './client';
import type { ImageScope, PresignedUploadResponse } from './types';

export const imageApi = {
    requestWorkspacePresignedUpload: (
        workspaceSlug: string,
        scope: ImageScope,
        fileName: string,
        contentType: string
    ) =>
        request<PresignedUploadResponse>(
            `/api/workspaces/${encodeURIComponent(workspaceSlug)}/images/presigned-upload`,
            {
                method: 'POST',
                body: JSON.stringify({ scope, fileName, contentType }),
            }
        ),
    /**
     * @deprecated Workspace slug 없이 기본 Workspace를 암묵적으로 선택하던 레거시 경로다.
     * 현재 화면은 requestWorkspacePresignedUpload 또는 공고 스크린샷 전용 임시 업로드를 사용해야 한다.
     */
    requestPresignedUpload: async (
        _scope: ImageScope,
        _fileName: string,
        _contentType: string
    ): Promise<PresignedUploadResponse> => {
        // 레거시 호출부와의 타입 호환성만 남기고 서버 요청은 절대 보내지 않는다.
        void [_scope, _fileName, _contentType];
        throw new ApiError(
            410,
            '레거시 이미지 업로드 경로가 폐쇄되었습니다. Workspace 전용 업로드를 사용해 주세요.'
        );
    },
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
    uploadPrivateToPresignedUrl: async (uploadUrl: string, file: File): Promise<void> => {
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type,
                'Cache-Control': 'no-store',
            },
        });
        if (!response.ok) {
            throw new ApiError(
                response.status,
                `임시 이미지 업로드에 실패했습니다: ${response.status}`
            );
        }
    },
};
