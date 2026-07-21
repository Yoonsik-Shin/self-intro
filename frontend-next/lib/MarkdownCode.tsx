'use client';

import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from 'react';
import type { ExtraProps } from 'react-markdown';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import docker from 'react-syntax-highlighter/dist/esm/languages/prism/docker';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import kotlin from 'react-syntax-highlighter/dist/esm/languages/prism/kotlin';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';

export type CodeLanguageChange = (
    position: { start: number; end: number },
    language: string
) => void;

type CodeProps = ComponentPropsWithoutRef<'code'> &
    ExtraProps & {
        onLanguageChange?: CodeLanguageChange;
    };

export const codeLanguages = [
    { value: 'text', label: 'Plain Text', aliases: [] },
    { value: 'javascript', label: 'JavaScript', aliases: ['js'] },
    { value: 'typescript', label: 'TypeScript', aliases: ['ts'] },
    { value: 'python', label: 'Python', aliases: ['py'] },
    { value: 'java', label: 'Java', aliases: [] },
    { value: 'go', label: 'Go', aliases: [] },
    { value: 'rust', label: 'Rust', aliases: [] },
    { value: 'cpp', label: 'C++', aliases: [] },
    { value: 'c', label: 'C', aliases: [] },
    { value: 'csharp', label: 'C#', aliases: ['cs'] },
    { value: 'html', label: 'HTML', aliases: [] },
    { value: 'css', label: 'CSS', aliases: [] },
    { value: 'json', label: 'JSON', aliases: [] },
    { value: 'yaml', label: 'YAML', aliases: ['yml'] },
    { value: 'markdown', label: 'Markdown', aliases: ['md'] },
    { value: 'sql', label: 'SQL', aliases: [] },
    { value: 'bash', label: 'Bash', aliases: ['sh', 'shell'] },
    { value: 'dockerfile', label: 'Dockerfile', aliases: ['docker'] },
    { value: 'xml', label: 'XML', aliases: [] },
] as const;

function normalizeLanguage(language?: string) {
    if (!language) return 'text';
    return (
        codeLanguages.find(
            ({ value, aliases }) =>
                value === language || aliases.some((alias) => alias === language)
        )?.value ?? language
    );
}

SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('shell', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('c', c);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('csharp', csharp);
SyntaxHighlighter.registerLanguage('cs', csharp);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('docker', docker);
SyntaxHighlighter.registerLanguage('dockerfile', docker);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('js', javascript);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('kotlin', kotlin);
SyntaxHighlighter.registerLanguage('kt', kotlin);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('md', markdown);
SyntaxHighlighter.registerLanguage('html', markup);
SyntaxHighlighter.registerLanguage('xml', markup);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('py', python);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.registerLanguage('yml', yaml);

let mermaidSequence = 0;
let mermaidInitialized = false;

function MermaidDiagram({ source }: { source: string }) {
    const diagramRef = useRef<HTMLDivElement>(null);
    const [rendering, setRendering] = useState(false);
    const [error, setError] = useState('');
    const normalizedSource = source.trim();

    useEffect(() => {
        if (!normalizedSource || !diagramRef.current) {
            setRendering(false);
            setError('');
            return;
        }

        let cancelled = false;
        const render = async () => {
            setRendering(true);
            try {
                const mermaid = (await import('mermaid')).default;
                if (!mermaidInitialized) {
                    mermaid.initialize({
                        startOnLoad: false,
                        securityLevel: 'strict',
                        theme: 'neutral',
                    });
                    mermaidInitialized = true;
                }

                const container = diagramRef.current;
                if (!container || cancelled) return;

                container.removeAttribute('data-processed');
                container.id = `study-mermaid-${++mermaidSequence}`;
                container.textContent = normalizedSource;
                await mermaid.run({ nodes: [container] });

                if (!cancelled) {
                    setError('');
                    setRendering(false);
                }
            } catch (renderError) {
                if (!cancelled) {
                    setError(
                        renderError instanceof Error
                            ? renderError.message
                            : 'Mermaid 문법을 확인해 주세요.'
                    );
                    setRendering(false);
                }
            }
        };
        void render();
        return () => {
            cancelled = true;
        };
    }, [normalizedSource]);

    if (!normalizedSource) {
        return (
            <div className="my-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-xs text-slate-500">
                Mermaid 블록 안에 다이어그램 문법을 입력해 주세요.
                <code className="mt-2 block font-mono text-slate-400">
                    graph TD&nbsp;&nbsp;A[시작] --&gt; B[완료]
                </code>
            </div>
        );
    }

    return (
        <div className="my-4">
            {error && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-xs font-bold text-red-700">Mermaid 렌더링에 실패했습니다.</p>
                    <p className="mt-1 text-xs text-red-600">{error}</p>
                    <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                        {source}
                    </pre>
                </div>
            )}
            <div
                className={`relative min-h-24 overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 ${error ? 'hidden' : ''}`}
            >
                {rendering && (
                    <div className="absolute inset-0 z-10 grid place-items-center bg-white/80 text-xs font-semibold text-slate-400">
                        다이어그램 렌더링 중...
                    </div>
                )}
                <div
                    ref={diagramRef}
                    className="[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
                />
            </div>
        </div>
    );
}

export function MarkdownCode({ children, className, node, onLanguageChange }: CodeProps) {
    const source = children == null ? '' : String(children).replace(/\n$/, '');
    const rawLanguage = className?.match(/language-([\w-]+)/)?.[1]?.toLowerCase();
    const language = normalizeLanguage(rawLanguage);
    const isBlock = Boolean(rawLanguage) || source.includes('\n');

    if (rawLanguage === 'mermaid') {
        return <MermaidDiagram source={source} />;
    }

    if (!isBlock) {
        return (
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] text-slate-800">
                {children}
            </code>
        );
    }

    const start = node?.position?.start.offset;
    const end = node?.position?.end.offset;
    const canChangeLanguage = onLanguageChange && start !== undefined && end !== undefined;
    const selectedLanguage = codeLanguages.some(({ value }) => value === language)
        ? language
        : 'text';
    const selectedLabel =
        codeLanguages.find(({ value }) => value === selectedLanguage)?.label ?? 'Plain Text';

    return (
        <div className="my-4 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-sm">
            <div className="flex h-10 items-center justify-between border-b border-slate-700 bg-slate-900 px-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Code
                </span>
                {canChangeLanguage ? (
                    <label className="relative">
                        <span className="sr-only">코드 언어</span>
                        <select
                            value={selectedLanguage}
                            onChange={(event) =>
                                onLanguageChange({ start, end }, event.target.value)
                            }
                            className="cursor-pointer appearance-none rounded-md border border-slate-600 bg-slate-800 py-1 pl-2.5 pr-7 text-xs font-semibold text-slate-200 outline-none transition hover:border-slate-500 focus:border-blue-400"
                        >
                            {codeLanguages.map(({ value, label }) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">
                            ▼
                        </span>
                    </label>
                ) : (
                    <span className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
                        {selectedLabel}
                    </span>
                )}
            </div>
            <SyntaxHighlighter
                language={selectedLanguage}
                style={vscDarkPlus}
                showLineNumbers={source.split('\n').length >= 4}
                wrapLongLines={false}
                customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    padding: '1rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.6',
                    background: 'transparent',
                }}
                codeTagProps={{
                    style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
                }}
            >
                {source}
            </SyntaxHighlighter>
        </div>
    );
}
