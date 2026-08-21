import type { Metadata } from 'next';
import { PlatformLandingPage } from '@/components/platform/PlatformLandingPage';

const DEFAULT_HEADING = 'Self-Intro 개인·기업 소개 Workspace';
const DEFAULT_SUBHEADING =
    '개인의 경력과 기업·팀의 프로젝트 근거를 구조화하고 공개 페이지와 PDF로 연결하는 소개 Workspace입니다.';

export function generateMetadata(): Metadata {
    return { title: DEFAULT_HEADING, description: DEFAULT_SUBHEADING };
}

export default function ProductHomePage() {
    return <PlatformLandingPage />;
}
