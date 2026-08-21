import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type PlatformFooterProps = {
    workspaceAttribution?: boolean;
};

export function PlatformFooter({ workspaceAttribution = false }: PlatformFooterProps) {
    return (
        <footer className="mt-10 border-t border-slate-800 bg-slate-950 text-slate-300 print:hidden">
            <div className="mx-auto max-w-[1500px] px-4 py-9 sm:px-6 lg:px-8">
                <div className="grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
                    <div>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-lg font-black tracking-[-0.03em] text-white"
                        >
                            Self-Intro <ArrowRight className="h-4 w-4" />
                        </Link>
                        <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
                            경력과 조직의 기록을 한곳에서 관리하고, 필요한 공개 페이지와 문서로
                            전달하는 Workspace 서비스입니다.
                        </p>
                    </div>

                    <nav aria-label="서비스 안내">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                            서비스
                        </p>
                        <div className="mt-3 grid gap-2.5 text-sm font-bold">
                            <Link href="/" className="w-fit hover:text-white">
                                서비스 소개
                            </Link>
                            <Link href="/architecture/demo" className="w-fit hover:text-white">
                                기능 체험
                            </Link>
                            <Link href="/pricing" className="w-fit hover:text-white">
                                요금제
                            </Link>
                        </div>
                    </nav>

                    <nav aria-label="정책 안내">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                            신뢰와 정책
                        </p>
                        <div className="mt-3 grid gap-2.5 text-sm font-bold">
                            <Link href="/policies/privacy" className="w-fit hover:text-white">
                                개인정보처리방침
                            </Link>
                            <Link href="/policies/terms" className="w-fit hover:text-white">
                                이용약관
                            </Link>
                        </div>
                    </nav>
                </div>

                {workspaceAttribution && (
                    <div className="mt-8 border-t border-slate-800 pt-5 text-xs leading-5 text-slate-500">
                        현재 페이지는 Self-Intro로 발행된 공개 Workspace입니다.
                    </div>
                )}
            </div>
        </footer>
    );
}
