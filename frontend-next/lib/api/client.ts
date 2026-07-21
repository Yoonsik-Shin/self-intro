'use client';

// 브라우저 전용 fetch 래퍼. document.cookie(CSRF 토큰)를 읽으므로 서버 컴포넌트에서
// import하면 런타임에 "document is not defined" 에러가 난다 — 공개 GET 페칭은
// lib/api/server.ts를 사용할 것.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toString().toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  if (method !== 'GET') {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-XSRF-TOKEN'] = csrfToken;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function toApiError(response: Response): Promise<ApiError> {
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
  return new ApiError(response.status, message);
}

export async function requestEventStream<TEvent>(
  path: string,
  payload: unknown,
  onEvent: (event: TEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-XSRF-TOKEN'] = csrfToken;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok || !response.body) {
    throw await toApiError(response);
  }

  const emit = (rawEvent: string) => {
    const data = rawEvent
      .split('\n')
      .map((line) => line.replace(/\r$/, ''))
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, ''))
      .join('\n');
    if (data) onEvent(JSON.parse(data) as TEvent);
  };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let separator = buffer.indexOf('\n\n');
    while (separator >= 0) {
      emit(buffer.slice(0, separator));
      buffer = buffer.slice(separator + 2);
      separator = buffer.indexOf('\n\n');
    }
  }
  if (buffer.trim()) emit(buffer);
}
