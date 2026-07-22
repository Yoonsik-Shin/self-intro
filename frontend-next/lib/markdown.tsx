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
        <ul className="list-disc list-outside pl-6 my-3.5 space-y-1.5 text-sm sm:text-base leading-relaxed text-slate-700">
            {children}
        </ul>
    ),
    ol: ({ children }) => (
        <ol className="list-decimal list-outside pl-6 my-3.5 space-y-1.5 text-sm sm:text-base leading-relaxed text-slate-700">
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

import type { Plugin } from 'unified';
import type { Root, Parent, RootContent } from 'mdast';

/**
 * CommonMark 사양 제한(**O(N)**에 처럼 닫는 부호 뒤 한글 조사가 이어질 때)을
 * 원본 문자열 가공 없이 Markdown AST(mdast) 파싱 파이프라인 단계에서 안전하게 굵은 글씨(Strong) 노드로 정식 변환하는 remark 플러그인.
 * code, inlineCode 내부 등은 전혀 건드리지 않아 데이터 원본과 AST 정합성을 보장합니다.
 */
export const remarkKoreanEmphasis: Plugin<[], Root> = () => {
    return (tree: Root) => {
        const visit = (node: Parent) => {
            if (!node.children || !Array.isArray(node.children)) return;

            const newChildren: RootContent[] = [];
            for (const child of node.children) {
                if (child.type === 'code' || child.type === 'inlineCode') {
                    newChildren.push(child as RootContent);
                    continue;
                }

                if (child.type === 'text') {
                    const textStr = child.value;
                    const regex = /\*\*([^*\n]+)\*\*(?=[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9])/g;
                    let lastIndex = 0;
                    let match: RegExpExecArray | null;
                    let hasMatch = false;

                    while ((match = regex.exec(textStr)) !== null) {
                        hasMatch = true;
                        const matchStart = match.index;
                        const innerContent = match[1];

                        if (matchStart > lastIndex) {
                            newChildren.push({
                                type: 'text',
                                value: textStr.slice(lastIndex, matchStart),
                            });
                        }

                        newChildren.push({
                            type: 'strong',
                            children: [{ type: 'text', value: innerContent }],
                        });

                        lastIndex = regex.lastIndex;
                    }

                    if (hasMatch) {
                        if (lastIndex < textStr.length) {
                            newChildren.push({
                                type: 'text',
                                value: textStr.slice(lastIndex),
                            });
                        }
                    } else {
                        newChildren.push(child as RootContent);
                    }
                } else {
                    if ('children' in child && Array.isArray((child as Parent).children)) {
                        visit(child as Parent);
                    }
                    newChildren.push(child as RootContent);
                }
            }
            node.children = newChildren as RootContent[];
        };

        visit(tree as Parent);
    };
};
