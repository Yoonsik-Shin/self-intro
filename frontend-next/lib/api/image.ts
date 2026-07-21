import { request, ApiError } from './client';
import type { ImageScope, PresignedUploadResponse } from './types';

export const imageApi = {
  requestPresignedUpload: (scope: ImageScope, fileName: string, contentType: string) =>
    request<PresignedUploadResponse>('/api/admin/images/presigned-upload', {
      method: 'POST',
      body: JSON.stringify({ scope, fileName, contentType }),
    }),
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
};
