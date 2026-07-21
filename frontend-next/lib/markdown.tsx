import type { Components } from 'react-markdown';
import { MarkdownCode, type CodeLanguageChange } from './MarkdownCode';

// Headings here are markdown *content* headings, one tier below the page's own
// h1 title (text-3xl/4xl, set where the article is rendered) — they should read
// as subsections of that title, not compete with it.
const baseMarkdownComponents: Components = {
    h1: ({ children }) => (
        <h1 className="mt-8 mb-4 text-xl sm:text-2xl font-black text-slate-950 border-b border-slate-100 pb-2">
            {children}
        </h1>
    ),
    h2: ({ children }) => (
        <h2 className="mt-6 mb-3 text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-1.5">
            {children}
        </h2>
    ),
    h3: ({ children }) => (
        <h3 className="mt-5 mb-2.5 text-base sm:text-lg font-bold text-slate-900">{children}</h3>
    ),
    p: ({ children }) => (
        <p className="mb-3.5 text-sm sm:text-base leading-relaxed text-slate-700">{children}</p>
    ),
    ul: ({ children }) => (
        <ul className="list-disc pl-5 my-3.5 space-y-1.5 text-sm sm:text-base leading-relaxed text-slate-700">
            {children}
        </ul>
    ),
    ol: ({ children }) => (
        <ol className="list-decimal pl-5 my-3.5 space-y-1.5 text-sm sm:text-base leading-relaxed text-slate-700">
            {children}
        </ol>
    ),
    li: ({ children }) => <li className="leading-relaxed text-slate-700">{children}</li>,
    strong: ({ children }) => <strong className="font-bold text-slate-950">{children}</strong>,
    blockquote: ({ children }) => (
        <blockquote className="my-5 border-l-4 border-blue-500 bg-blue-50/30 px-4 py-2.5 text-slate-600 italic rounded-r-xl text-sm sm:text-base leading-relaxed">
            {children}
        </blockquote>
    ),
    a: ({ children, href }) => (
        <a
            href={href}
            className="font-semibold text-blue-600 hover:text-blue-800 underline decoration-2 transition"
            target="_blank"
            rel="noreferrer"
        >
            {children}
        </a>
    ),
    pre: ({ children }) => <>{children}</>,
};

export function createMarkdownComponents(onLanguageChange?: CodeLanguageChange): Components {
    return {
        ...baseMarkdownComponents,
        code: (props) => <MarkdownCode {...props} onLanguageChange={onLanguageChange} />,
    };
}

export const markdownComponents = createMarkdownComponents();

/** Compact Markdown used inside resume cards. Typography is inherited from the
 * surrounding resume hierarchy instead of switching back to article sizes. */
export const resumeMarkdownComponents: Components = {
    ...baseMarkdownComponents,
    p: ({ children }) => (
        <p className="mb-2 last:mb-0 leading-[inherit] text-inherit">{children}</p>
    ),
    ul: ({ children }) => (
        <ul className="my-2 list-disc space-y-1 pl-5 leading-[inherit] text-inherit">{children}</ul>
    ),
    ol: ({ children }) => (
        <ol className="my-2 list-decimal space-y-1 pl-5 leading-[inherit] text-inherit">
            {children}
        </ol>
    ),
    li: ({ children }) => <li className="leading-[inherit] text-inherit">{children}</li>,
    blockquote: ({ children }) => (
        <blockquote className="my-2 border-l-2 border-slate-300 pl-3 leading-[inherit] text-slate-600">
            {children}
        </blockquote>
    ),
};

/** Compact Markdown for admin list-row detail expansions. Sizing is inherited from
 * the surrounding card text instead of the full article scale, so headings inside
 * short summary/situation/outcome fields don't blow up a small card. */
export const adminDetailMarkdownComponents: Components = {
    h1: ({ children }) => (
        <h1 className="mt-2 mb-1 text-sm font-black leading-snug text-slate-900">{children}</h1>
    ),
    h2: ({ children }) => (
        <h2 className="mt-2 mb-1 text-sm font-bold leading-snug text-slate-900">{children}</h2>
    ),
    h3: ({ children }) => (
        <h3 className="mt-1.5 mb-1 text-xs font-bold leading-snug text-slate-800">{children}</h3>
    ),
    p: ({ children }) => (
        <p className="mb-1.5 last:mb-0 leading-[inherit] text-inherit">{children}</p>
    ),
    ul: ({ children }) => (
        <ul className="my-1.5 list-disc space-y-1 pl-4 leading-[inherit] text-inherit">
            {children}
        </ul>
    ),
    ol: ({ children }) => (
        <ol className="my-1.5 list-decimal space-y-1 pl-4 leading-[inherit] text-inherit">
            {children}
        </ol>
    ),
    li: ({ children }) => <li className="leading-[inherit] text-inherit">{children}</li>,
    strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
    blockquote: ({ children }) => (
        <blockquote className="my-1.5 border-l-2 border-slate-300 pl-2 italic leading-[inherit] text-slate-500">
            {children}
        </blockquote>
    ),
    a: ({ children, href }) => (
        <a
            href={href}
            className="font-semibold text-blue-600 hover:text-blue-800 underline decoration-2 transition"
            target="_blank"
            rel="noreferrer"
        >
            {children}
        </a>
    ),
    pre: ({ children }) => <>{children}</>,
};

export const experienceMarkdownComponents: Components = {
    ...baseMarkdownComponents,
    p: ({ children }) => (
        <p className="mb-2.5 text-[13.5px] sm:text-sm leading-relaxed text-slate-600">{children}</p>
    ),
    ul: ({ children }) => (
        <ul className="list-disc pl-5 my-2.5 space-y-1.5 text-[13.5px] sm:text-sm leading-relaxed text-slate-600">
            {children}
        </ul>
    ),
    ol: ({ children }) => (
        <ol className="list-decimal pl-5 my-2.5 space-y-1.5 text-[13.5px] sm:text-sm leading-relaxed text-slate-600">
            {children}
        </ol>
    ),
    blockquote: ({ children }) => (
        <blockquote className="my-3 border-l-4 border-slate-300 bg-slate-50/50 px-4 py-2 text-slate-500 italic rounded-r-lg text-[13.5px] sm:text-sm leading-relaxed">
            {children}
        </blockquote>
    ),
};
