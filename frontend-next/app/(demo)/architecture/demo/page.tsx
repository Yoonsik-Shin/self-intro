import type { Metadata } from 'next';
import { ProductDemoClient } from '@/components/architecture/ProductDemoClient';

export const metadata: Metadata = {
    title: 'Self-Intro 워크스페이스 데모',
    description:
        '구직자용 Self-Intro 워크스페이스에서 합성 경력 데이터를 편집하고 공개 페이지 미리보기를 확인합니다.',
};

export default function ProductDemoPage() {
    return <ProductDemoClient />;
}
