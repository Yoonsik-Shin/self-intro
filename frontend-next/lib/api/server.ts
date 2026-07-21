import 'server-only';

import { ApiError } from './client';

// 서버 컴포넌트 전용 GET 페칭. document.cookie 등 브라우저 API를 쓰지 않으므로
// 인증이 필요 없는 공개 데이터(이력서/경력/블로그 상세)에만 사용한다.
// 'server-only' 마커 덕분에 클라이언트 컴포넌트에서 이 파일을 import하면 빌드 타임에 에러가 난다.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export async function serverGet<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let message = `API request failed: ${response.status}`;
    if (errorText) {
      try {
        const errorBody = JSON.parse(errorText) as { detail?: string; message?: string; error?: string };
        message = errorBody.detail ?? errorBody.message ?? errorBody.error ?? message;
      } catch {
        message = errorText;
      }
    }
    throw new ApiError(response.status, message);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
