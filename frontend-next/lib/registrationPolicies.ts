export type RegistrationPolicyKey = 'terms' | 'privacy' | 'marketing';

export type RegistrationPolicy = {
    title: string;
    version: string;
    required: boolean;
    summary: string;
    sections: Array<{ heading: string; paragraphs: string[]; bullets?: string[] }>;
};

export const REGISTRATION_POLICIES: Record<RegistrationPolicyKey, RegistrationPolicy> = {
    terms: {
        title: 'Self-Intro 비공개 베타 이용약관',
        version: '2026-08-12-draft',
        required: true,
        summary: '비공개 베타 계정과 Workspace를 이용하기 위한 기본 조건입니다.',
        sections: [
            {
                heading: '서비스의 목적',
                paragraphs: [
                    'Self-Intro는 경력·프로젝트·학습 근거를 Workspace 단위로 관리하고 공개 프로필과 이력서 결과물을 만드는 비공개 베타 서비스입니다.',
                ],
            },
            {
                heading: '계정과 Workspace',
                paragraphs: [
                    '사용자는 정확한 가입 정보를 제공하고 계정 접근수단을 안전하게 관리해야 합니다. Workspace의 콘텐츠와 공개 범위는 해당 Workspace 권한을 가진 사용자가 관리합니다.',
                ],
            },
            {
                heading: '금지되는 이용',
                paragraphs: [
                    '타인의 개인정보·저작권을 침해하는 콘텐츠, 불법 콘텐츠, 서비스 안정성을 해치는 자동화·공격, 권한 우회 시도를 금지합니다.',
                ],
            },
            {
                heading: '베타 서비스의 변경과 중단',
                paragraphs: [
                    '베타 기간에는 기능과 데이터 구조가 변경될 수 있습니다. 중대한 변경이나 계획된 중단은 서비스 화면 또는 등록 이메일로 알립니다.',
                ],
            },
            {
                heading: '탈퇴와 데이터 삭제',
                paragraphs: [
                    '사용자는 계정 또는 Workspace 삭제를 요청할 수 있습니다. 법령상 보존 의무와 복구 유예기간이 있는 데이터는 해당 기간 후 삭제합니다. 구체적인 보존기간은 개인정보 처리 안내를 따릅니다.',
                ],
            },
            {
                heading: '운영 전 확정 필요',
                paragraphs: [
                    '정식 서비스 전 운영 주체의 상호·대표자·주소·연락처, 분쟁 처리와 준거법 문구를 확정하고 법률 검토를 받아야 합니다. 현재 문서는 로컬 비공개 베타용 초안입니다.',
                ],
            },
        ],
    },
    privacy: {
        title: '개인정보 수집·이용 및 처리 안내',
        version: '2026-08-12-draft',
        required: true,
        summary: '가입 시 수집하는 정보와 목적·보유기간·동의 거부 영향을 안내합니다.',
        sections: [
            {
                heading: '가입 시 수집·이용',
                paragraphs: [
                    '목적: 계정 생성, 본인 이메일 확인, 로그인, Workspace 제공, 보안과 부정 이용 방지.',
                ],
                bullets: [
                    '항목: 이메일, 닉네임, 암호화된 비밀번호, 초대·동의·이메일 확인 기록',
                    '보유기간: 회원 탈퇴 및 Workspace 삭제 처리 완료 시까지. 보안 감사 기록 등 법적·분쟁 대응에 필요한 최소 기록은 확정된 별도 기간 후 삭제',
                    '거부 권리와 영향: 동의를 거부할 수 있으나 계정 생성과 핵심 서비스 제공이 불가능합니다.',
                ],
            },
            {
                heading: '서비스 이용 중 생성되는 정보',
                paragraphs: [
                    '세션·접속 및 보안 이벤트, Workspace 역할, 사용자가 입력한 경력·학습·지원 자료와 공개 설정이 처리될 수 있습니다. 공개 전에는 기본적으로 비공개로 저장합니다.',
                ],
            },
            {
                heading: '정보주체의 권리',
                paragraphs: [
                    '사용자는 자신의 정보 열람·정정·삭제·처리정지와 동의 철회를 요청할 수 있습니다. Workspace 공개 여부와 콘텐츠는 관리 화면에서 변경할 수 있습니다.',
                ],
            },
            {
                heading: '처리위탁·국외이전',
                paragraphs: [
                    '정식 운영에서 이메일, 클라우드 저장소 또는 외부 AI 모델을 사용한다면 수탁자·이전 국가·항목·목적·시점·보유기간과 거부 방법을 확정해 이 문서에 공개해야 합니다. 현재 초안은 이를 확정된 사실로 기재하지 않습니다.',
                ],
            },
            {
                heading: '운영 전 확정 필요',
                paragraphs: [
                    '개인정보 보호책임자와 문의처, 실제 보존기간, 파기 절차, 처리위탁자, 국외이전, 쿠키·접속로그 정책을 배포 환경 기준으로 확정해야 합니다. 현재 문서는 로컬 비공개 베타용 초안입니다.',
                ],
            },
        ],
    },
    marketing: {
        title: '마케팅 정보 수신 동의',
        version: '2026-08-12-draft',
        required: false,
        summary: '신규 기능·베타 소식 등 선택적 안내 수신에 관한 동의입니다.',
        sections: [
            {
                heading: '수신 목적과 항목',
                paragraphs: ['목적: Self-Intro 신규 기능, 베타 프로그램, 이벤트와 설문 안내.'],
                bullets: [
                    '이용 항목: 이메일, 닉네임',
                    '전송 수단: 이메일',
                    '보유·이용기간: 동의 철회 또는 회원 탈퇴 시까지',
                ],
            },
            {
                heading: '선택 동의와 철회',
                paragraphs: [
                    '동의하지 않아도 가입과 핵심 기능 이용에는 제한이 없습니다. 사용자는 언제든지 계정 설정 또는 안내 메일의 수신거부 방법으로 철회할 수 있어야 합니다. 현재 로컬 베타에서는 마케팅 메시지를 발송하지 않습니다.',
                ],
            },
            {
                heading: '운영 전 확정 필요',
                paragraphs: [
                    '실제 발송 전 전송자 명칭·연락처, 수신거부 방법, 야간 광고 여부와 정기 수신동의 확인 절차를 확정해야 합니다.',
                ],
            },
        ],
    },
};

export function isRegistrationPolicyKey(value: string): value is RegistrationPolicyKey {
    return value === 'terms' || value === 'privacy' || value === 'marketing';
}
