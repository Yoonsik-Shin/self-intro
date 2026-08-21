import { Check, KeyRound, PenLine, Sparkles } from 'lucide-react';

const STANDARD_FEATURES = [
    ['경력 초안', '경력·프로젝트 설명의 초안 생성과 보정'],
    ['학습 초안', '학습 기록의 요약·구조화와 보정'],
    ['역량 초안', '연결된 근거를 바탕으로 역량 설명 작성'],
    ['포트폴리오 사례', '프로젝트 사례와 포트폴리오 문서 초안'],
    ['지원 분석·자기소개서', '채용 공고 분석과 지원 문서 초안'],
    ['AI PDF·출력 구성', 'AI를 이용한 문서 구성과 내용 생성'],
] as const;

const WITHOUT_AI_POINT = [
    '경력·프로젝트·학습·기술을 직접 기록하고 수정하기',
    '공개할 항목을 골라 프로필과 소개 페이지 발행하기',
    '직접 작성한 기존 내용으로 PDF를 렌더링·다운로드하기',
    'Workspace 멤버와 역할, 공개 범위를 관리하기',
] as const;

type AiPointUsageGuideProps = {
    id?: string;
    compact?: boolean;
};

export function AiPointUsageGuide({ id, compact = false }: AiPointUsageGuideProps) {
    return (
        <section
            id={id}
            className={`scroll-mt-24 rounded-xl border border-slate-300 bg-white ${compact ? 'p-5' : 'p-6 sm:p-8'}`}
        >
            <div className="max-w-3xl">
                <p className="text-sm font-black text-slate-500">AI point 사용 기준</p>
                <h2
                    className={`${compact ? 'mt-1 text-lg' : 'mt-2 text-2xl sm:text-3xl'} font-black tracking-tight text-slate-950`}
                >
                    직접 하는 작업은 무료, AI에게 요청할 때만 사용
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                    플랫폼 AI로 초안·보정·분석을 실행할 때 point를 사용합니다. 실행 전 최대 예상
                    point를 안내하고 예약한 뒤, 완료 후 실제 사용량만 확정합니다. Provider나 서버
                    처리에 실패하면 예약 point는 반환합니다.
                </p>
            </div>

            <div className={`mt-6 grid gap-6 ${compact ? 'xl:grid-cols-2' : 'lg:grid-cols-2'}`}>
                <div className="border-t border-slate-200 pt-5">
                    <div className="flex items-center gap-2">
                        <PenLine className="h-5 w-5 text-slate-700" />
                        <h3 className="font-black text-slate-950">AI point를 사용하지 않는 기능</h3>
                    </div>
                    <ul className="mt-4 grid gap-3">
                        {WITHOUT_AI_POINT.map((item) => (
                            <li
                                key={item}
                                className="flex items-start gap-2 text-sm leading-5 text-slate-600"
                            >
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="border-t border-slate-800 pt-5">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-slate-900" />
                        <h3 className="font-black text-slate-950">
                            플랫폼 AI point를 사용하는 기능
                        </h3>
                    </div>
                    <div className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">
                        {STANDARD_FEATURES.map(([title, description]) => (
                            <div key={title}>
                                <strong className="text-sm text-slate-900">{title}</strong>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    {description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-6 grid gap-3 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-600 sm:grid-cols-2">
                <p>
                    <strong className="text-slate-900">사용량 기준</strong>
                    <br />
                    100 point는 표준 전체 초안 약 1건의 비교 단위입니다. 짧은 보정은 전체 생성보다
                    적게 사용하며 실제 모델·토큰에 따라 달라집니다.
                </p>
                <p>
                    <strong className="inline-flex items-center gap-1.5 text-slate-900">
                        <KeyRound className="h-3.5 w-3.5" /> BYOK 사용
                    </strong>
                    <br />내 Provider key로 실행하면 플랫폼 AI point는 차감되지 않고 Provider 계정에
                    token 비용이 발생합니다. 실패해도 플랫폼 key로 자동 전환하지 않습니다.
                </p>
            </div>
        </section>
    );
}
