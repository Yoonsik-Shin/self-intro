import type { Metadata } from 'next';
import { ProductDemoClient } from '@/components/architecture/ProductDemoClient';

export const metadata: Metadata = {
    title: 'Self-Intro Workspace 기능 체험',
    description:
        '실제 Workspace 관리 화면과 같은 메뉴 구조에서 합성 경력 데이터를 편집하고 공개 페이지 구성과 AI point 사용 흐름을 확인합니다.',
};

export default function ProductDemoPage() {
    return <ProductDemoClient />;
}
