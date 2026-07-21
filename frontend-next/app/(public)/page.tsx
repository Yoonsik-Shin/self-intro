import type { Metadata } from 'next';
import { serverGet } from '@/lib/api/server';
import type { IntroductionResponse } from '@/lib/api/types';
import { IntroPageClient } from '@/components/intro/IntroPageClient';

// 프로필/경력/역량은 관리자 CRUD로 계속 바뀌므로 빌드 타임 정적 생성 대신 요청마다 서버 렌더링한다.
export const dynamic = 'force-dynamic';

async function getIntroduction(): Promise<IntroductionResponse> {
    return serverGet<IntroductionResponse>('/api/bff/introduction');
}

export async function generateMetadata(): Promise<Metadata> {
    const { profile } = await getIntroduction();
    if (!profile) return { title: 'Yoonsik Shin' };

    const title = `${profile.name} · ${profile.jobTitle}`;
    const description = profile.bio;

    return {
        title,
        description,
        openGraph: { title, description, type: 'profile' },
        twitter: { card: 'summary_large_image', title, description },
    };
}

export default async function HomePage() {
    const introData = await getIntroduction();
    return <IntroPageClient introData={introData} />;
}
