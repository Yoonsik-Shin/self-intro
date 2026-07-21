import type { LucideIcon } from 'lucide-react';
import {
    Blocks,
    BookOpenCheck,
    Bot,
    BriefcaseBusiness,
    CloudCog,
    Code2,
    Database,
    FolderKanban,
    Shapes,
} from 'lucide-react';

export type SkillCategoryPresentation = {
    key: string;
    label: string;
    description: string;
    Icon: LucideIcon;
};

export const skillCategoryPresentations: SkillCategoryPresentation[] = [
    {
        key: 'LANGUAGE',
        label: '개발 언어',
        description: '서비스 구현에 사용하는 핵심 프로그래밍 언어',
        Icon: Code2,
    },
    {
        key: 'FRAMEWORK',
        label: '프레임워크 · 라이브러리',
        description: '애플리케이션 구조와 개발 생산성을 구성하는 기술',
        Icon: Blocks,
    },
    {
        key: 'DATABASE',
        label: '데이터베이스 · 데이터 처리',
        description: '저장소, 캐시, 조회 및 데이터 모델링 기술',
        Icon: Database,
    },
    {
        key: 'DEVOPS',
        label: '인프라 · DevOps',
        description: '배포, 운영, 관측 및 클라우드 인프라 기술',
        Icon: CloudCog,
    },
    {
        key: 'AI_RAG',
        label: 'AI · RAG',
        description: 'LLM, 검색 증강 및 AI 서비스 구현 기술',
        Icon: Bot,
    },
    {
        key: 'ETC',
        label: '기타 도구 · 역량',
        description: '개발과 협업을 보조하는 도구 및 기반 역량',
        Icon: Shapes,
    },
];

export const fallbackSkillCategory: SkillCategoryPresentation = {
    key: 'UNKNOWN',
    label: '기타 기술',
    description: '별도 분류가 지정되지 않은 기술',
    Icon: Shapes,
};

export const skillUsagePresentations: Record<
    string,
    { label: string; Icon: LucideIcon; className: string }
> = {
    WORK_EXPERIENCE: {
        label: '실무 경험',
        Icon: BriefcaseBusiness,
        className: 'border-slate-300 bg-slate-100 text-slate-700',
    },
    PROJECT_USE: {
        label: '프로젝트 활용',
        Icon: FolderKanban,
        className: 'border-slate-200 bg-white text-slate-600',
    },
    LEARNING: {
        label: '학습',
        Icon: BookOpenCheck,
        className: 'border-slate-200 bg-slate-50 text-slate-500',
    },
};

export function getSkillCategoryPresentation(category: string) {
    return (
        skillCategoryPresentations.find((item) => item.key === category) ?? {
            ...fallbackSkillCategory,
            key: category,
        }
    );
}

export function getSkillLevelDotClass(level?: string) {
    if (!level) return 'bg-slate-300';
    const normalized = level.toLowerCase();
    if (normalized.includes('고급') || normalized.includes('상')) return 'bg-slate-900';
    if (normalized.includes('중급') || normalized.includes('중')) return 'bg-slate-600';
    if (normalized.includes('초급') || normalized.includes('초')) return 'bg-slate-400';
    return 'bg-slate-400';
}
