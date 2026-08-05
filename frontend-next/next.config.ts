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
};

export default nextConfig;
