import type { DecisionDomain, ExperienceTreeSituationSummary } from './api/types';

export type ExperienceTreeCategory = {
    key: string;
    label: string;
    description: string;
    topics: Record<string, string>;
};

export const DOMAIN_META: Record<DecisionDomain, { label: string; description: string }> = {
    BACKEND: {
        label: 'Backend',
        description: '언어와 런타임, API, 데이터, 보안, 비동기 처리의 서버 측 의사결정',
    },
    ARCHITECTURE: {
        label: 'Architecture',
        description: '서비스 경계, 통신, 데이터 소유권과 시스템 진화 전략',
    },
    INFRASTRUCTURE: {
        label: 'Infrastructure',
        description: '배포, 네트워크, 복구, 관측과 플랫폼 운영 의사결정',
    },
    FRONTEND: {
        label: 'Frontend',
        description: '렌더링, 상태, 데이터 흐름, 사용자 경험과 브라우저 런타임 의사결정',
    },
};

export const EXPERIENCE_TREE_CATEGORIES: Record<DecisionDomain, ExperienceTreeCategory[]> = {
    BACKEND: [
        {
            key: 'language-runtime',
            label: '언어와 런타임',
            description: '업무 특성에 맞는 언어, 실행 모델과 동시성 방식을 선택합니다.',
            topics: {
                LANGUAGE_SELECTION: '기능에 따른 언어 선택',
                RUNTIME_MODEL: '런타임과 동시성 모델',
                CONCURRENCY: '동시성 제어',
                ASYNC: '비동기 실행',
                SPRING: 'Spring 런타임',
            },
        },
        {
            key: 'data-persistence',
            label: '데이터와 영속성',
            description: '저장소 종류, 데이터 모델, 트랜잭션과 조회 전략을 결정합니다.',
            topics: {
                DATABASE_SELECTION: '데이터베이스 선택',
                DATABASE: '관계형 데이터베이스',
                TRANSACTION: '트랜잭션',
                PERSISTENCE: 'ORM과 조회',
                CACHE: '캐시',
            },
        },
        {
            key: 'api-integration',
            label: 'API와 시스템 연동',
            description: '외부 계약, 요청 제어, 메시지 전달과 파일 흐름을 설계합니다.',
            topics: {
                API: 'HTTP API',
                MESSAGING: '메시징',
                FILE: '파일 처리',
            },
        },
        {
            key: 'security',
            label: '인증과 보안',
            description: '신원, 자격 증명과 신뢰할 수 없는 입력의 경계를 다룹니다.',
            topics: { SECURITY: '애플리케이션 보안' },
        },
    ],
    ARCHITECTURE: [
        {
            key: 'boundaries',
            label: '경계와 소유권',
            description: '모듈·서비스·테넌트의 책임과 데이터 소유 단위를 결정합니다.',
            topics: {
                SERVICE_BOUNDARY: '서비스 경계',
                DATA_OWNERSHIP: '데이터 소유권',
                MULTITENANCY: '멀티테넌시',
                API_GATEWAY: 'API 진입점',
            },
        },
        {
            key: 'distributed-systems',
            label: '분산 시스템',
            description: '통신, 일관성, 장애와 분산 트랜잭션을 다룹니다.',
            topics: {
                COMMUNICATION: '서비스 통신',
                CONSISTENCY: '분산 일관성',
                MESSAGING: '이벤트 발행',
                RESILIENCE: '회복 탄력성',
            },
        },
        {
            key: 'models-evolution',
            label: '모델과 진화',
            description: '읽기·쓰기 모델과 계약을 장기간 안전하게 진화시킵니다.',
            topics: {
                DATA_MODEL: '데이터 모델',
                EVENT_SOURCING: '이벤트 상태',
                CONTRACT: '계약 진화',
            },
        },
    ],
    INFRASTRUCTURE: [
        {
            key: 'delivery-platform',
            label: '배포와 플랫폼',
            description: '애플리케이션을 반복 가능하고 안전하게 배포·실행합니다.',
            topics: {
                DEPLOYMENT: '배포 전략',
                DELIVERY: 'IaC와 전달 자동화',
                KUBERNETES: 'Kubernetes 워크로드',
            },
        },
        {
            key: 'network-security',
            label: '네트워크와 구성 보안',
            description: '트래픽 진입점과 런타임 비밀값 경계를 설계합니다.',
            topics: { NETWORK: '네트워크 진입점', CONFIGURATION: '비밀값과 구성' },
        },
        {
            key: 'reliability',
            label: '가용성과 복구',
            description: '확장, 상태 저장, 백업과 재해 복구 목표를 관리합니다.',
            topics: { SCALING: '확장', STORAGE: '상태 저장', RECOVERY: '백업과 재해 복구' },
        },
        {
            key: 'observability',
            label: '관측 가능성',
            description: '메트릭, 로그와 장애 진단 신호를 일관되게 수집합니다.',
            topics: { OBSERVABILITY: '관측 신호', LOGGING: '로그 수집' },
        },
    ],
    FRONTEND: [
        {
            key: 'rendering-architecture',
            label: '렌더링과 컴포넌트',
            description: '서버·클라이언트 경계와 재사용 가능한 UI 계약을 설계합니다.',
            topics: {
                RENDERING: '렌더링 경계',
                COMPONENT: '컴포넌트 API',
                ACCESSIBILITY: '접근성',
                RELIABILITY: '오류 격리',
            },
        },
        {
            key: 'state-data',
            label: '상태와 데이터 흐름',
            description: '상태 소유권, 서버 데이터 동기화와 실시간 전달을 다룹니다.',
            topics: {
                STATE: '상태 소유권',
                DATA_FETCHING: '데이터 조회',
                CACHE: '클라이언트 캐시',
                FORM: '폼 상태',
                REALTIME: '실시간 전송',
            },
        },
        {
            key: 'performance',
            label: '성능과 브라우저 동작',
            description: '로딩 비용, 목록 정체성과 사용자 체감 성능을 최적화합니다.',
            topics: { PERFORMANCE: '로딩 성능', LIST: '목록 렌더링' },
        },
    ],
};

export function categoryFor(situation: Pick<ExperienceTreeSituationSummary, 'domain' | 'topic'>) {
    const categories = EXPERIENCE_TREE_CATEGORIES[situation.domain];
    const category = categories.find((item) => situation.topic in item.topics);
    return (
        category ?? {
            key: 'etc',
            label: '기타 의사결정',
            description: '아직 세부 분류를 확정하지 않은 의사결정입니다.',
            topics: { [situation.topic]: situation.topic },
        }
    );
}

export function categoryBreadcrumb(
    situation: Pick<ExperienceTreeSituationSummary, 'domain' | 'topic'>
) {
    const category = categoryFor(situation);
    return [DOMAIN_META[situation.domain].label, category.label, category.topics[situation.topic]];
}
