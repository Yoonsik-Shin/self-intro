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

// LAN 기기(태블릿 등)로 dev 서버 접속 테스트할 때만 쓴다. Next.js dev 서버는 기본적으로
// 자기 자신의 dev 리소스(HMR 웹소켓, 폰트 등)에 대한 cross-origin 요청을 막는데, LAN IP로
// 접속하면 그 IP가 매번 "외부 origin"으로 취급돼 차단된다. 개인 LAN IP를 리포에 커밋하지
// 않도록 docker-compose.override.yml(git-ignored)에서 콤마로 구분해 주입한다.
const allowedDevOrigins = process.env.NEXT_DEV_ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const nextConfig: NextConfig = {
    output: 'standalone',
    transpilePackages: ['remark-gfm', 'remark-breaks'],
    ...(allowedDevOrigins?.length ? { allowedDevOrigins } : {}),
    // 자동 메모이제이션 — PrintCanvas처럼 거대한 컴포넌트에서 상태 하나 바뀔 때마다
    // 전체 서브트리가 동기 재렌더되는 비용을 줄인다. dev:docker가 --webpack으로
    // 고정돼있어(turbopack 아님) babel-plugin-react-compiler 경로를 쓴다.
    reactCompiler: true,
    turbopack: {
        root: path.resolve(__dirname),
    },
    env: {
        NEXT_PUBLIC_BUILD_DATE: buildDate,
        // Docker Compose가 프로세스 환경으로 주입한 공개 API 주소도 브라우저 번들에
        // 명시적으로 고정한다. Next dev가 바인드 마운트 환경에서 이 값을 누락하면
        // 클라이언트 요청이 상대 경로(/api/*)로 3000번 Next 서버에 들어가 404가 난다.
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
        NEXT_PUBLIC_TOSS_PAYMENTS_API_LOG_URL:
            process.env.NEXT_PUBLIC_TOSS_PAYMENTS_API_LOG_URL ?? '',
        NEXT_PUBLIC_EXAMPLE_WORKSPACE_SLUG:
            process.env.NEXT_PUBLIC_EXAMPLE_WORKSPACE_SLUG ?? 'w-199d6de326de71385a98',
        // 명시적으로 PAID를 주입하기 전에는 가격과 결제 진입점을 공개하지 않는다.
        NEXT_PUBLIC_RELEASE_CHANNEL: process.env.NEXT_PUBLIC_RELEASE_CHANNEL ?? 'PRIVATE_BETA',
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
                    // 공개 초안은 같은 origin의 Workspace 관리 화면 안에서만 iframe으로
                    // 렌더링한다. 외부 origin의 clickjacking은 계속 차단한다.
                    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
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
