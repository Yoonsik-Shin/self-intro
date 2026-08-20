import type { ReactNode } from 'react';
import { CircleHelp } from 'lucide-react';

type AdminPageHeaderProps = {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    headingAs?: 'h1' | 'h2';
    compact?: boolean;
    descriptionMode?: 'inline' | 'tooltip';
    contentInset?: 'none' | 'card';
};

export function AdminPageHeader({
    title,
    description,
    actions,
    headingAs = 'h2',
    compact = true,
    descriptionMode = 'tooltip',
    contentInset = 'card',
}: AdminPageHeaderProps) {
    const Heading = headingAs;
    const tooltipLabel = typeof title === 'string' ? `${title} 설명` : '페이지 설명';

    return (
        <header
            className={`sticky top-0 z-30 flex shrink-0 flex-col bg-[#f8fafc] sm:flex-row sm:justify-between ${contentInset === 'card' ? 'px-5' : ''} ${
                compact ? 'gap-3 sm:items-center' : 'gap-4 sm:items-end'
            }`}
        >
            <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                    <Heading
                        className={`min-w-0 truncate font-semibold tracking-tight text-slate-950 ${compact ? 'text-lg leading-6' : 'text-2xl'}`}
                    >
                        {title}
                    </Heading>
                    {description && descriptionMode === 'tooltip' && (
                        <span className="group/help relative inline-flex shrink-0">
                            <button
                                type="button"
                                aria-label={tooltipLabel}
                                className={`grid place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-800 focus-visible:bg-slate-200 focus-visible:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${compact ? 'h-5 w-5' : 'h-6 w-6'}`}
                            >
                                <CircleHelp
                                    className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}
                                />
                            </button>
                            <span
                                role="tooltip"
                                className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-80 max-w-[70vw] translate-y-1 rounded-lg bg-slate-900 px-3 py-2.5 text-left text-xs font-medium normal-case leading-5 text-white opacity-0 shadow-lg transition group-hover/help:translate-y-0 group-hover/help:opacity-100 group-focus-within/help:translate-y-0 group-focus-within/help:opacity-100"
                            >
                                {description}
                            </span>
                        </span>
                    )}
                </div>
                {description && descriptionMode === 'inline' && (
                    <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">
                        {description}
                    </p>
                )}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>
    );
}
