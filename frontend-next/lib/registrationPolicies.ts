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
        version: '2026-08-22',
        required: true,
        summary: '비공개 베타 계정과 Workspace를 이용하기 위한 조건입니다.',
        sections: [
            {
                heading: '서비스의 목적',
                paragraphs: [
                    'Self-Intro는 경력·프로젝트·학습 근거를 Workspace 단위로 관리하고 공개 프로필과 문서 결과물을 만드는 서비스입니다.',
                ],
            },
            {
                heading: '계정과 Workspace',
                paragraphs: [
                    '사용자는 정확한 가입 정보를 제공하고 계정 접근수단을 안전하게 관리해야 합니다. Workspace의 콘텐츠와 공개 범위는 해당 Workspace 권한을 가진 사용자가 관리합니다.',
                    '사용자는 자신이 입력하거나 공개하는 자료에 필요한 권리를 보유해야 하며, 타인의 개인정보가 포함된 경우 적법한 처리 근거와 동의를 확보해야 합니다.',
                ],
            },
            {
                heading: '금지되는 이용',
                paragraphs: [
                    '타인의 개인정보·저작권을 침해하는 콘텐츠, 불법 콘텐츠, 서비스 안정성을 해치는 자동화·공격, 권한 우회 시도와 다른 이용자에게 피해를 주는 행위를 금지합니다.',
                ],
            },
            {
                heading: '베타 서비스의 변경과 중단',
                paragraphs: [
                    '베타 기간에는 기능과 데이터 구조가 변경될 수 있습니다. 중대한 변경이나 계획된 중단은 서비스 화면 또는 등록 이메일로 알립니다.',
                    '점검, 장애, 보안 사고 또는 불가항력으로 서비스가 일시 중단될 수 있으며 운영자는 합리적인 범위에서 복구와 피해 최소화를 위해 노력합니다.',
                ],
            },
            {
                heading: '비공개 베타와 향후 유료 플랜',
                paragraphs: [
                    '비공개 베타 기간에는 구독료를 청구하지 않으며 카드 등록, 구독 결제, AI point 구매를 제공하지 않습니다. 베타 이용자를 자동으로 유료 플랜으로 전환하지 않습니다.',
                    '정식 유료 출시 전 플랜별 최종 결제금액, 제공 기능, 결제 주기와 환불 조건을 별도로 안내하고 필요한 동의를 다시 받습니다.',
                ],
            },
            {
                heading: '탈퇴와 데이터 삭제',
                paragraphs: [
                    '사용자는 계정 또는 Workspace 삭제를 요청할 수 있습니다. 법령상 보존 의무와 복구 유예기간이 있는 데이터는 해당 기간 후 삭제합니다. 구체적인 처리 기준은 개인정보 처리 안내를 따릅니다.',
                ],
            },
            {
                heading: '운영자와 문의',
                paragraphs: [
                    '브랜드는 unbrdn, 서비스명은 Self-Intro이며 운영자·대표자·개인정보 보호책임자는 신윤식입니다.',
                    '비공개 베타 문의는 이메일로만 접수합니다. 고객지원은 support@unbrdn.me, 개인정보 문의는 privacy@unbrdn.me, 결제 관련 사전 문의는 billing@unbrdn.me로 연락할 수 있습니다.',
                    '문의 운영시간은 평일 09:00~18:00이며 최초 답변 목표는 영업일 기준 1일 이내입니다. 공개 전화번호, 사업장 주소, 사업자등록 및 통신판매업 정보는 유료 공개 서비스 개시 전에 관련 법령에 따라 고지합니다.',
                ],
            },
            {
                heading: '준거법과 분쟁',
                paragraphs: [
                    '이 약관은 대한민국 법령을 따릅니다. 분쟁이 발생하면 운영자와 이용자는 우선 협의하며, 해결되지 않는 경우 민사소송법상 관할 법원에 제기할 수 있습니다.',
                ],
            },
        ],
    },
    privacy: {
        title: 'Self-Intro 개인정보 처리 안내',
        version: '2026-08-22',
        required: true,
        summary: '가입과 서비스 이용 중 처리하는 정보, 목적, 보유기간과 이용자 권리를 안내합니다.',
        sections: [
            {
                heading: '개인정보 처리자와 문의처',
                paragraphs: [
                    'Self-Intro의 운영자와 개인정보 보호책임자는 신윤식입니다. 개인정보 열람·정정·삭제·처리정지와 기타 문의는 privacy@unbrdn.me로 접수합니다. 일반 고객지원은 support@unbrdn.me로 접수합니다.',
                ],
            },
            {
                heading: '가입 시 수집·이용',
                paragraphs: [
                    '계정 생성, 이메일 확인, 로그인, Workspace 제공, 보안과 부정 이용 방지를 위해 아래 정보를 처리합니다.',
                ],
                bullets: [
                    '필수 항목: 이메일, 닉네임, 암호화된 비밀번호, 초대·동의·이메일 확인 기록',
                    '보유기간: 회원 탈퇴 및 Workspace 삭제 처리 완료 시까지. 별도 법적 의무나 분쟁 대응 필요성이 있으면 해당 목적에 필요한 최소 범위와 기간 동안 분리 보관',
                    '동의 거부: 필수 정보 처리에 동의하지 않으면 계정 생성과 핵심 서비스 제공이 불가능합니다.',
                ],
            },
            {
                heading: '서비스 이용 중 처리되는 정보',
                paragraphs: [
                    '세션·접속 및 보안 이벤트, Workspace 역할, 사용자가 입력한 경력·프로젝트·학습·지원 자료, 파일과 공개 설정이 처리될 수 있습니다. 저장한 원본은 사용자가 직접 발행하기 전까지 공개 페이지에 노출하지 않습니다.',
                ],
            },
            {
                heading: '보유기간과 파기',
                paragraphs: [
                    '계정과 Workspace 콘텐츠는 이용자가 삭제하거나 탈퇴할 때까지 보유합니다. Workspace 삭제 시 복구를 위한 30일 유예기간 후 삭제 절차를 진행합니다.',
                    '이메일 전송 로그는 전달 상태 확인과 장애 대응을 위해 최대 30일 보유합니다. 보안·감사 또는 분쟁 대응 기록은 관련 목적 달성이나 법정 보존기간 종료 후 복구하기 어려운 방법으로 삭제합니다.',
                ],
            },
            {
                heading: '처리 인프라와 외부 제공자',
                paragraphs: [
                    '서비스 애플리케이션, 저장소와 이메일 전송은 Oracle Cloud Infrastructure의 대한민국 춘천 리전을 사용합니다. 문의용 unbrdn.me 이메일은 Cloudflare Email Routing을 통해 운영자가 확인하는 수신함으로 전달됩니다.',
                    '비공개 베타에서는 외부 AI 모델 호출 기능을 제공하지 않습니다. 외부 AI 기능을 개방하기 전 제공자, 이전 국가·지역, 처리 항목, 목적, 보유기간과 거부 방법을 확정해 별도로 안내하고 필요한 동의를 받습니다.',
                ],
            },
            {
                heading: '쿠키와 접속기록',
                paragraphs: [
                    '로그인 세션 유지, 요청 위조 방지와 보안을 위해 필수 쿠키와 접속기록을 사용할 수 있습니다. 비공개 베타에서는 맞춤 광고를 위한 추적 쿠키를 사용하지 않습니다.',
                ],
            },
            {
                heading: '정보주체의 권리와 보호조치',
                paragraphs: [
                    '사용자는 자신의 정보 열람·정정·삭제·처리정지와 동의 철회를 요청할 수 있습니다. Workspace 공개 여부와 콘텐츠는 관리 화면에서 변경할 수 있습니다.',
                    '접근권한 통제, 전송구간 암호화, 비밀번호 단방향 해시, 보안 감사기록과 최소권한 원칙을 적용하며, 개인정보 침해가 의심되면 privacy@unbrdn.me로 알릴 수 있습니다.',
                ],
            },
        ],
    },
    marketing: {
        title: '마케팅 정보 수신 동의',
        version: '2026-08-22',
        required: false,
        summary: '신규 기능·베타 소식 등 선택적 안내 수신에 관한 동의입니다.',
        sections: [
            {
                heading: '수신 목적과 항목',
                paragraphs: [
                    'Self-Intro 신규 기능, 베타 프로그램, 이벤트와 설문 안내를 위해 사용합니다.',
                ],
                bullets: [
                    '이용 항목: 이메일, 닉네임',
                    '전송 수단: 이메일',
                    '보유·이용기간: 동의 철회 또는 회원 탈퇴 시까지',
                ],
            },
            {
                heading: '선택 동의와 철회',
                paragraphs: [
                    '동의하지 않아도 가입과 핵심 기능 이용에는 제한이 없습니다. 사용자는 언제든지 계정 설정 또는 안내 메일의 수신거부 방법으로 철회할 수 있습니다.',
                    '비공개 베타 기간에는 마케팅 메시지를 발송하지 않습니다. 실제 발송을 시작할 때 전송자 명칭과 연락처, 수신거부 방법을 각 메시지에 표시합니다.',
                ],
            },
        ],
    },
};

export function isRegistrationPolicyKey(value: string): value is RegistrationPolicyKey {
    return value === 'terms' || value === 'privacy' || value === 'marketing';
}
