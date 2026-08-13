import path from 'node:path';
import type { NextConfig } from 'next';

// 원본(Vite)의 __BUILD_DATE__와 동등하게, 빌드(또는 dev 서버 시작) 시점의 배포시각을
// 상태 배지에 표시하기 위해 주입한다. 버전(package.json)은 릴리스마다 손으로 올리지
// 않아 계속 고정값이라 표시하지 않는다.
const buildDate = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
}).format(new Date());

const nextConfig: NextConfig = {
    output: 'standalone',
    transpilePackages: ['remark-gfm', 'remark-breaks'],
    turbopack: {
        root: path.resolve(__dirname),
    },
    env: {
        NEXT_PUBLIC_BUILD_DATE: buildDate,
    },
    webpack(config, { dev }) {
        // Docker Desktop의 익명 .next 볼륨에서 webpack filesystem cache가 장기간
        // 누적되지 않게 한다. 일반 로컬 개발과 production build의 cache는 유지한다.
        if (dev && process.env.NEXT_DISABLE_WEBPACK_CACHE === 'true') {
            config.cache = false;
        }
        return config;
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains',
                    },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    // 가입 초대·이메일 확인 토큰이 외부 요청의 Referer로 전달되지 않게 한다.
                    { key: 'Referrer-Policy', value: 'no-referrer' },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
