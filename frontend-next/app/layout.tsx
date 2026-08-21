import type { Metadata } from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';
import { Providers } from './providers';

export const metadata: Metadata = {
    title: 'Self-Intro',
    description: '개인과 조직의 기록을 공개 페이지와 지원 문서로 만드는 Workspace 서비스',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko" className="h-full antialiased">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
                    rel="stylesheet"
                />
                <link
                    rel="stylesheet"
                    href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
                    crossOrigin="anonymous"
                />
                {/* PDF 인쇄 문서 전체 톤(폰트) 선택지 — 고딕(Pretendard) 외 명조/모노 옵션 */}
                <link
                    href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700&family=Nanum+Gothic+Coding:wght@400;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className="min-h-full flex flex-col font-['Plus_Jakarta_Sans',Pretendard,sans-serif]">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
