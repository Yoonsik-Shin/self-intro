import type { Components } from 'react-markdown';
import { MarkdownCode, type CodeLanguageChange } from './MarkdownCode';

// Headings here are markdown *content* headings, one tier below the page's own
// h1 title (text-3xl/4xl, set where the article is rendered) — they should read
// as subsections of that title, not compete with it.
const baseMarkdownComponents: Components = {
    h1: ({ children, node: _node, ...props }) => (
        <h1
            {...props}
            className="mt-6 mb-3 text-xl sm:text-2xl font-black text-slate-950 border-b border-slate-100 pb-1.5"
        >
            {children}
        </h1>
    ),
    h2: ({ children, node: _node, ...props }) => (
        <h2
            {...props}
            className="mt-5 mb-2.5 text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-1"
        >
            {children}
        </h2>
    ),
    h3: ({ children, node: _node, ...props }) => (
        <h3 {...props} className="mt-4 mb-2 text-base sm:text-lg font-bold text-slate-900">
            {children}
        </h3>
    ),
    p: ({ children, node: _node, ...props }) => (
        <p {...props} className="mb-2.5 text-sm sm:text-base leading-[1.55] text-slate-700">
            {children}
        </p>
    ),
    ul: ({ children, node: _node, ...props }) => (
        <ul
            {...props}
            className="list-disc list-outside pl-5 space-y-1 text-sm sm:text-base leading-[1.55] text-slate-700"
        >
            {children}
        </ul>
    ),
    ol: ({ children, node: _node, ...props }) => (
        <ol
            {...props}
            className="list-decimal list-outside pl-5 space-y-1 text-sm sm:text-base leading-[1.55] text-slate-700"
        >
            {children}
        </ol>
    ),
    li: ({ children, node: _node, ...props }) => (
        <li {...props} className="leading-[1.55] text-slate-700">
            {children}
        </li>
    ),
    strong: ({ children, node: _node, ...props }) => (
        <strong {...props} className="font-bold text-slate-950">
            {children}
        </strong>
    ),
    blockquote: ({ children, node: _node, ...props }) => (
        <blockquote
            {...props}
            className="my-3 border-l-4 border-blue-500 bg-blue-50/30 px-3.5 py-2 text-slate-600 italic rounded-r-xl text-sm sm:text-base leading-[1.55]"
        >
            {children}
        </blockquote>
    ),
    a: ({ children, href, node: _node, ...props }) => (
        <a
            {...props}
            href={href}
            className="font-semibold text-blue-600 hover:text-blue-800 underline decoration-2 transition"
            target="_blank"
            rel="noreferrer"
        >
            {children}
        </a>
    ),
    details: ({ children, node: _node, ...props }) => (
        <details
            {...props}
            className="group/details my-3.5 rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-all open:bg-white open:shadow-sm open:border-slate-300"
        >
            {children}
        </details>
    ),
    summary: ({ children, node: _node, ...props }) => (
        <summary
            {...props}
            className="flex cursor-pointer select-none items-center justify-between font-bold text-slate-800 transition hover:text-indigo-600 focus:outline-none [&::-webkit-details-marker]:hidden"
        >
            <span className="flex items-center gap-2 text-sm sm:text-base">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-indigo-100 text-[10px] font-bold text-indigo-700 transition-transform duration-200 group-open/details:rotate-90">
                    ▶
                </span>
                {children}
            </span>
            <span className="text-xs font-semibold text-slate-400 group-open/details:hidden">
                클릭하여 내용 보기
            </span>
            <span className="hidden text-xs font-semibold text-slate-400 group-open/details:inline">
                접기
            </span>
        </summary>
    ),
    pre: ({ children, node, ...props }) => <pre {...props}>{children}</pre>,
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
 * CommonMark의 구식 규격인 "공백 4칸 들여쓰기 시 코드 블록 변환(Indented Code Block)"을 비활성화하는 Remark/Micromark 공식 표준 옵션 플러그인.
 * 이를 통해 에디터에서 Tab을 눌러 공백이 깊어져도 백틱(```) 없는 불렛 목록이 뜬금없이 CODE 박스로 렌더링되는 현상을 완전히 차단합니다.
 */
export const remarkDisableIndentedCode: Plugin = function () {
    const data = this.data() as Record<string, unknown>;
    const micromarkExtensions =
        (data.micromarkExtensions as unknown[]) || (data.micromarkExtensions = []);
    micromarkExtensions.push({
        disable: { null: ['codeIndented'] },
    });
};

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

/**
 * Notion / Obsidian / GFM Callout 및 접기/펼치기 토글 구문 지원 remark 플러그인.
 *
 * 지원되는 구문:
 * 1. > [!TOGGLE] 제목
 * 2. > [!DETAILS] 제목
 * 3. > [!SUMMARY] 제목
 * 4. > ▶ 제목
 * 5. <details><summary>제목</summary>내용</details>
 *
 * blockquote 노드 중 위 구문으로 시작하는 노드를 AST 레벨에서 <details>와 <summary> 노드로 변환합니다.
 */
export const remarkCalloutToggle: Plugin<[], Root> = () => {
    return (tree: Root) => {
        const visit = (node: Parent) => {
            if (!node.children || !Array.isArray(node.children)) return;

            for (const child of node.children) {
                if (child.type === 'blockquote') {
                    const bq = child as Parent;
                    if (bq.children && bq.children.length > 0) {
                        const firstPara = bq.children[0];
                        if (
                            firstPara &&
                            firstPara.type === 'paragraph' &&
                            Array.isArray((firstPara as Parent).children)
                        ) {
                            const paraParent = firstPara as Parent;
                            const firstTextNode = paraParent.children[0];

                            if (firstTextNode && firstTextNode.type === 'text') {
                                const val = firstTextNode.value;
                                const match = val.match(
                                    /^\s*(\[\!(TOGGLE|DETAILS|SUMMARY|CALLOUT)\]|▶)\s*(.*)/i
                                );

                                if (match) {
                                    const headerTitle = match[3];
                                    firstTextNode.value = headerTitle;

                                    // Transform blockquote to details
                                    bq.data = {
                                        ...bq.data,
                                        hName: 'details',
                                    };

                                    // Transform first paragraph to summary
                                    firstPara.data = {
                                        ...firstPara.data,
                                        hName: 'summary',
                                    };
                                }
                            }
                        }
                    }
                }

                if ('children' in child && Array.isArray((child as Parent).children)) {
                    visit(child as Parent);
                }
            }
        };

        visit(tree as Parent);
    };
};

/**
 * 에디터와 미리보기 패널의 1:1 정교한 라인 위치 스크롤 동기화를 위해
 * MDAST 각 블록 엘리먼트에 data-source-line 특성을 부여하는 remark 플러그인
 */
export const remarkSourceLine = () => {
    return (tree: unknown) => {
        const visit = (node: any) => {
            if (!node) return;
            if (node.position?.start?.line) {
                node.data = node.data || {};
                node.data.hProperties = node.data.hProperties || {};
                node.data.hProperties['data-source-line'] = node.position.start.line;
            }
            if (Array.isArray(node.children)) {
                node.children.forEach(visit);
            }
        };
        visit(tree);
    };
};

/**
 * 리스트(ul/ol) 항목 내부에서 엔터(Break) 이후 작성된 줄을
 * 리스트 들여쓰기 밖(원문 왼쪽 시작선)으로 깔끔하게 맞추는 MDAST 플러그인
 */
export const remarkUnindentListLines: Plugin<[], Root> = () => {
    return (tree: Root) => {
        const visit = (node: Parent) => {
            if (!node.children || !Array.isArray(node.children)) return;

            for (const child of node.children) {
                if (child.type === 'listItem') {
                    const item = child as Parent;
                    if (item.children) {
                        for (let i = 0; i < item.children.length; i++) {
                            const childBlock = item.children[i];
                            if (
                                childBlock.type === 'paragraph' &&
                                Array.isArray((childBlock as Parent).children)
                            ) {
                                const para = childBlock as Parent;
                                const breakIndex = para.children.findIndex(
                                    (c) => c.type === 'break'
                                );
                                if (breakIndex !== -1 && breakIndex < para.children.length - 1) {
                                    const beforeBreak = para.children.slice(0, breakIndex);
                                    const afterBreak = para.children.slice(breakIndex + 1);

                                    para.children = [
                                        ...beforeBreak,
                                        {
                                            type: 'paragraph',
                                            data: {
                                                hName: 'span',
                                                hProperties: {
                                                    className: 'markdown-unindent',
                                                },
                                            },
                                            children: afterBreak,
                                        } as unknown as RootContent,
                                    ];
                                }
                            }
                        }
                    }
                }

                if ('children' in child && Array.isArray((child as Parent).children)) {
                    visit(child as Parent);
                }
            }
        };

        visit(tree as Parent);
    };
};

/**
 * 연속된 빈 줄(엔터) 및 리스트 자동 탈출을 처리하는 전처리기:
 * 1. 작성한 엔터 횟수만큼 빈 공간(<br />)으로 렌더링되도록 전처리
 * 2. 리스트(-, 1.) 바로 다음 줄에 불렛 없이 일반 텍스트를 적은 경우,
 *    리스트 내부로 갇혀 들여쓰기되는 파서 현상을 자동 방지하여 외부 본문으로 분리
 */
export function preprocessMarkdown(markdown: string): string {
    if (!markdown) return '';

    // 백틱 3개(``` ... ```) 펜스 코드 블록만 격리하여 인라인 코드(`...`)에 의해 줄이 잘리는 현상을 방지
    const fencedCodeBlockRegex = /(```[\s\S]*?```)/g;
    const parts = markdown.split(fencedCodeBlockRegex);

    return parts
        .map((part, index) => {
            if (index % 2 === 1) return part;

            let processed = part;

            // 1. </details> 닫는 태그 바로 뒤에 빈 줄 없이 마크다운(#, - 등)이 오면 마크다운 파서가 깨지는 현상 방지
            processed = processed.replace(/(<\/details>)\n(?=[^\n])/gi, '$1\n\n');

            // 2. 연속된 빈 줄(\n\n\n+)을 <br />로 전환
            processed = processed.replace(/\n(\s*\n)+/g, (match) => {
                const emptyLineCount = match.split('\n').length - 2;
                if (emptyLineCount <= 0) return match;
                return '\n\n' + '<br />'.repeat(emptyLineCount) + '\n\n';
            });

            return processed;
        })
        .join('');
}
