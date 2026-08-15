import type { ReactNode } from 'react';

type AdminPageHeaderProps = {
    title: ReactNode;
    description?: ReactNode;
    eyebrow?: ReactNode;
    actions?: ReactNode;
    headingAs?: 'h1' | 'h2';
};

export function AdminPageHeader({
    title,
    description,
    eyebrow,
    actions,
    headingAs = 'h2',
}: AdminPageHeaderProps) {
    const Heading = headingAs;

    return (
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                {eyebrow && (
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
                        {eyebrow}
                    </p>
                )}
                <Heading
                    className={`${eyebrow ? 'mt-1.5' : ''} text-2xl font-black tracking-tight text-slate-950`}
                >
                    {title}
                </Heading>
                {description && (
                    <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">
                        {description}
                    </p>
                )}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>
    );
}
