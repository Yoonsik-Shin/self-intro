import type { Metadata } from 'next';
import { OrganizationExamplePage } from '@/components/platform/OrganizationExamplePage';

export const metadata: Metadata = {
    title: '기업·팀 공개 Workspace 예시 | Self-Intro',
    description:
        '합성 데이터로 구성한 기업·팀 소개 Workspace에서 회사 소개, 프로젝트, 기술과 협업 문화를 확인합니다.',
};

export default function OrganizationExampleRoute() {
    return <OrganizationExamplePage />;
}
