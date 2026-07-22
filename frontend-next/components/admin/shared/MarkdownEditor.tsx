'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import {
    Bold,
    Code2,
    Eye,
    Heading2,
    ImagePlus,
    Italic,
    Link,
    List,
    ListOrdered,
    Loader2,
    Workflow,
} from 'lucide-react';
import { createMarkdownComponents, preprocessMarkdown } from '@/lib/markdown';
import { imageApi } from '@/lib/api';

type Props = {
    value: string;
    onChange: (value: string) => void;
    // Study의 본문 편집기에서만 켜는 기능 — 이 컴포넌트는 Experience의 summary/takeaway/
    // situation/actionDetail/outcome 편집에도 재사용되므로 기본값은 꺼짐.
    enableImageUpload?: boolean;
};

const IMAGE_ACCEPT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const tools = [
    { label: '제목', icon: Heading2, before: '## ', after: '', placeholder: '제목' },
    { label: '굵게', icon: Bold, before: '**', after: '**', placeholder: '강조할 내용' },
    { label: '기울임', icon: Italic, before: '_', after: '_', placeholder: '내용' },
    { label: '목록', icon: List, before: '- ', after: '', placeholder: '항목' },
    { label: '번호 목록', icon: ListOrdered, before: '1. ', after: '', placeholder: '항목' },
    { label: '코드', icon: Code2, before: '```\n', after: '\n```', placeholder: 'code' },
    {
        label: 'Mermaid',
        icon: Workflow,
        before: '```mermaid\n',
        after: '\n```',
        placeholder: 'graph TD\n  A[시작] --> B[완료]',
    },
    { label: '링크', icon: Link, before: '[', after: '](https://)', placeholder: '링크 이름' },
];

interface HistoryItem {
    value: string;
    selectionStart: number;
    selectionEnd: number;
}

export function MarkdownEditor({ value, onChange, enableImageUpload }: Props) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Custom History for Undo/Redo (Cmd+Z / Cmd+Shift+Z)
    const historyRef = useRef<HistoryItem[]>([]);
    const historyIndexRef = useRef<number>(-1);
    const isInternalChangeRef = useRef<boolean>(false);

    // Sync external value or initialize history
    useEffect(() => {
        if (isInternalChangeRef.current) {
            isInternalChangeRef.current = false;
            return;
        }
        const textarea = textareaRef.current;
        const selStart = textarea?.selectionStart ?? value.length;
        const selEnd = textarea?.selectionEnd ?? value.length;

        historyRef.current = [{ value, selectionStart: selStart, selectionEnd: selEnd }];
        historyIndexRef.current = 0;
    }, [value]);

    const recordHistory = useCallback(
        (newValue: string, selectionStart: number, selectionEnd: number) => {
            isInternalChangeRef.current = true;
            const currentIdx = historyIndexRef.current;
            const newHistory = historyRef.current.slice(0, currentIdx + 1);
            newHistory.push({ value: newValue, selectionStart, selectionEnd });

            if (newHistory.length > 100) {
                newHistory.shift();
            }
            historyRef.current = newHistory;
            historyIndexRef.current = newHistory.length - 1;
            onChange(newValue);
        },
        [onChange]
    );

    const undo = useCallback(() => {
        if (historyIndexRef.current > 0) {
            historyIndexRef.current -= 1;
            const item = historyRef.current[historyIndexRef.current];
            isInternalChangeRef.current = true;
            onChange(item.value);
            requestAnimationFrame(() => {
                const textarea = textareaRef.current;
                if (textarea) {
                    textarea.focus();
                    textarea.setSelectionRange(item.selectionStart, item.selectionEnd);
                }
            });
        }
    }, [onChange]);

    const redo = useCallback(() => {
        if (historyIndexRef.current < historyRef.current.length - 1) {
            historyIndexRef.current += 1;
            const item = historyRef.current[historyIndexRef.current];
            isInternalChangeRef.current = true;
            onChange(item.value);
            requestAnimationFrame(() => {
                const textarea = textareaRef.current;
                if (textarea) {
                    textarea.focus();
                    textarea.setSelectionRange(item.selectionStart, item.selectionEnd);
                }
            });
        }
    }, [onChange]);

    useLayoutEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }, [value]);

    const editorMarkdownComponents = useMemo(
        () =>
            createMarkdownComponents(({ start, end }, language) => {
                const codeBlock = value.slice(start, end);
                const nextCodeBlock = codeBlock.replace(
                    /^(`{3,}|~{3,})[^\r\n]*/,
                    (_, fence: string) => `${fence}${language === 'text' ? '' : language}`
                );
                if (nextCodeBlock !== codeBlock) {
                    onChange(`${value.slice(0, start)}${nextCodeBlock}${value.slice(end)}`);
                }
            }),
        [onChange, value]
    );

    const insertOrWrap = useCallback(
        (before: string, after: string, placeholder: string) => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const fullText = value;
            const rawSelected = fullText.slice(start, end);

            // Case 1: Exact selection wrapping match (e.g. selection is "**bold**")
            const isSelectedWrapped =
                rawSelected.length >= before.length + after.length &&
                rawSelected.startsWith(before) &&
                rawSelected.endsWith(after);

            if (isSelectedWrapped) {
                const unwrapped = rawSelected.slice(
                    before.length,
                    rawSelected.length - after.length
                );
                const nextValue = `${fullText.slice(0, start)}${unwrapped}${fullText.slice(end)}`;
                const newStart = start;
                const newEnd = start + unwrapped.length;
                recordHistory(nextValue, newStart, newEnd);
                requestAnimationFrame(() => {
                    textarea.focus();
                    textarea.setSelectionRange(newStart, newEnd);
                });
                return;
            }

            // Case 2: Selection or cursor is surrounded by `before` and `after`
            const hasBeforeSurrounding =
                start >= before.length && fullText.slice(start - before.length, start) === before;
            const hasAfterSurrounding = fullText.slice(end, end + after.length) === after;

            if (hasBeforeSurrounding && hasAfterSurrounding) {
                const nextValue = `${fullText.slice(0, start - before.length)}${rawSelected}${fullText.slice(end + after.length)}`;
                const newStart = start - before.length;
                const newEnd = newStart + rawSelected.length;
                recordHistory(nextValue, newStart, newEnd);
                requestAnimationFrame(() => {
                    textarea.focus();
                    textarea.setSelectionRange(newStart, newEnd);
                });
                return;
            }

            // Case 3: Wrap selected text
            if (rawSelected) {
                const wrapped = `${before}${rawSelected}${after}`;
                const nextValue = `${fullText.slice(0, start)}${wrapped}${fullText.slice(end)}`;
                const newStart = start + before.length;
                const newEnd = newStart + rawSelected.length;
                recordHistory(nextValue, newStart, newEnd);
                requestAnimationFrame(() => {
                    textarea.focus();
                    textarea.setSelectionRange(newStart, newEnd);
                });
            } else {
                // Case 4: Insert placeholder
                const inserted = `${before}${placeholder}${after}`;
                const nextValue = `${fullText.slice(0, start)}${inserted}${fullText.slice(end)}`;
                const newStart = start + before.length;
                const newEnd = newStart + placeholder.length;
                recordHistory(nextValue, newStart, newEnd);
                requestAnimationFrame(() => {
                    textarea.focus();
                    textarea.setSelectionRange(newStart, newEnd);
                });
            }
        },
        [recordHistory, value]
    );

    const insertAtCursor = useCallback(
        (text: string) => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const nextValue = `${value.slice(0, start)}${text}${value.slice(end)}`;
            const newSel = start + text.length;

            recordHistory(nextValue, newSel, newSel);
            requestAnimationFrame(() => {
                textarea.focus();
                textarea.setSelectionRange(newSel, newSel);
            });
        },
        [recordHistory, value]
    );

    const handleImageSelected = async (file: File | undefined) => {
        if (!file) return;
        if (!IMAGE_ACCEPT_TYPES.includes(file.type)) {
            window.alert(`지원하지 않는 이미지 형식입니다: ${file.name}`);
            return;
        }
        setUploadingImage(true);
        try {
            const presigned = await imageApi.requestPresignedUpload(
                'STUDY_MARKDOWN',
                file.name,
                file.type
            );
            await imageApi.uploadToPresignedUrl(presigned.uploadUrl, file);
            insertAtCursor(`![](${presigned.publicUrl})`);
        } catch {
            window.alert('이미지 업로드에 실패했습니다.');
        } finally {
            setUploadingImage(false);
            if (imageInputRef.current) imageInputRef.current.value = '';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const isMac =
            typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        const modKey = isMac ? e.metaKey : e.ctrlKey;

        // 1. Undo / Redo Shortcuts (Cmd+Z / Cmd+Shift+Z / Cmd+Y)
        if (modKey && (e.key === 'z' || e.key === 'Z')) {
            e.preventDefault();
            if (e.shiftKey) {
                redo();
            } else {
                undo();
            }
            return;
        }
        if (modKey && (e.key === 'y' || e.key === 'Y')) {
            e.preventDefault();
            redo();
            return;
        }

        // 2. Formatting Shortcuts
        if (modKey && (e.key === 'b' || e.key === 'B')) {
            e.preventDefault();
            insertOrWrap('**', '**', '강조할 내용');
            return;
        }
        if (modKey && (e.key === 'i' || e.key === 'I')) {
            e.preventDefault();
            insertOrWrap('_', '_', '내용');
            return;
        }
        if (modKey && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault();
            insertOrWrap('[', '](https://)', '링크 이름');
            return;
        }
        if (modKey && (e.key === 'e' || e.key === 'E')) {
            e.preventDefault();
            insertOrWrap('`', '`', 'code');
            return;
        }

        // 3. Tab / Shift+Tab Handling (Indent / Outdent)
        if (e.key === 'Tab' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;

            if (start !== end) {
                // Multi-line selection: indent or outdent every line
                const lineStart = value.lastIndexOf('\n', start - 1) + 1;
                const lineEnd = value.indexOf('\n', end);
                const actualEnd = lineEnd === -1 ? value.length : lineEnd;
                const selectedText = value.slice(lineStart, actualEnd);
                const lines = selectedText.split('\n');

                if (e.shiftKey) {
                    // Outdent
                    const newLines = lines.map((line) => line.replace(/^ {1,2}/, ''));
                    const nextSelectedText = newLines.join('\n');
                    const nextValue = `${value.slice(0, lineStart)}${nextSelectedText}${value.slice(actualEnd)}`;
                    recordHistory(
                        nextValue,
                        Math.max(lineStart, start - 2),
                        lineStart + nextSelectedText.length
                    );
                    requestAnimationFrame(() => {
                        textarea.focus();
                        textarea.setSelectionRange(
                            Math.max(lineStart, start - 2),
                            lineStart + nextSelectedText.length
                        );
                    });
                } else {
                    // Indent
                    const newLines = lines.map((line) => `  ${line}`);
                    const nextSelectedText = newLines.join('\n');
                    const nextValue = `${value.slice(0, lineStart)}${nextSelectedText}${value.slice(actualEnd)}`;
                    recordHistory(nextValue, start + 2, lineStart + nextSelectedText.length);
                    requestAnimationFrame(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + 2, lineStart + nextSelectedText.length);
                    });
                }
            } else {
                // Single line cursor
                const prevNewline = value.lastIndexOf('\n', start - 1);
                const lineStart = prevNewline === -1 ? 0 : prevNewline + 1;

                if (e.shiftKey) {
                    // Outdent line (remove 2 leading spaces if present)
                    const currentLine = value.slice(lineStart);
                    if (currentLine.startsWith('  ')) {
                        const nextValue = `${value.slice(0, lineStart)}${value.slice(lineStart + 2)}`;
                        const newPos = Math.max(lineStart, start - 2);
                        recordHistory(nextValue, newPos, newPos);
                        requestAnimationFrame(() => {
                            textarea.focus();
                            textarea.setSelectionRange(newPos, newPos);
                        });
                    } else if (currentLine.startsWith(' ')) {
                        const nextValue = `${value.slice(0, lineStart)}${value.slice(lineStart + 1)}`;
                        const newPos = Math.max(lineStart, start - 1);
                        recordHistory(nextValue, newPos, newPos);
                        requestAnimationFrame(() => {
                            textarea.focus();
                            textarea.setSelectionRange(newPos, newPos);
                        });
                    }
                } else {
                    // Indent line by adding 2 spaces at line start
                    const nextValue = `${value.slice(0, lineStart)}  ${value.slice(lineStart)}`;
                    const newPos = start + 2;
                    recordHistory(nextValue, newPos, newPos);
                    requestAnimationFrame(() => {
                        textarea.focus();
                        textarea.setSelectionRange(newPos, newPos);
                    });
                }
            }
            return;
        }

        // 4. Smart Enter Key Handling (List continuation & Quote continuation)
        if (e.key === 'Enter' && !e.shiftKey) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;

            if (start === end) {
                const prevNewline = value.lastIndexOf('\n', start - 1);
                const lineStart = prevNewline === -1 ? 0 : prevNewline + 1;
                const nextNewline = value.indexOf('\n', start);
                const lineEnd = nextNewline === -1 ? value.length : nextNewline;

                const wholeLine = value.slice(lineStart, lineEnd);

                // Ordered list: e.g. "1. ", "  2. "
                const olMatch = wholeLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
                if (olMatch) {
                    const [, indent, numStr, content] = olMatch;
                    e.preventDefault();
                    if (!content.trim()) {
                        // Empty list item -> Exit list! Remove whole line prefix
                        const nextValue = `${value.slice(0, lineStart)}${value.slice(lineEnd)}`;
                        recordHistory(nextValue, lineStart, lineStart);
                        requestAnimationFrame(() => {
                            textarea.focus();
                            textarea.setSelectionRange(lineStart, lineStart);
                        });
                    } else {
                        // Continue list with next number
                        const nextNum = parseInt(numStr, 10) + 1;
                        const prefix = `\n${indent}${nextNum}. `;
                        const nextValue = `${value.slice(0, start)}${prefix}${value.slice(end)}`;
                        const newPos = start + prefix.length;
                        recordHistory(nextValue, newPos, newPos);
                        requestAnimationFrame(() => {
                            textarea.focus();
                            textarea.setSelectionRange(newPos, newPos);
                        });
                    }
                    return;
                }

                // Unordered list: e.g. "- ", "* ", "+ "
                const ulMatch = wholeLine.match(/^(\s*)([-*+])\s+(.*)$/);
                if (ulMatch) {
                    const [, indent, bullet, content] = ulMatch;
                    e.preventDefault();
                    if (!content.trim()) {
                        // Empty list item -> Exit list! Remove whole line
                        const nextValue = `${value.slice(0, lineStart)}${value.slice(lineEnd)}`;
                        recordHistory(nextValue, lineStart, lineStart);
                        requestAnimationFrame(() => {
                            textarea.focus();
                            textarea.setSelectionRange(lineStart, lineStart);
                        });
                    } else {
                        // Continue list
                        const prefix = `\n${indent}${bullet} `;
                        const nextValue = `${value.slice(0, start)}${prefix}${value.slice(end)}`;
                        const newPos = start + prefix.length;
                        recordHistory(nextValue, newPos, newPos);
                        requestAnimationFrame(() => {
                            textarea.focus();
                            textarea.setSelectionRange(newPos, newPos);
                        });
                    }
                    return;
                }

                // Blockquote: e.g. "> "
                const quoteMatch = wholeLine.match(/^(\s*)(>)\s+(.*)$/);
                if (quoteMatch) {
                    const [, indent, quoteSymbol, content] = quoteMatch;
                    e.preventDefault();
                    if (!content.trim()) {
                        // Empty quote -> Exit quote!
                        const nextValue = `${value.slice(0, lineStart)}${value.slice(lineEnd)}`;
                        recordHistory(nextValue, lineStart, lineStart);
                        requestAnimationFrame(() => {
                            textarea.focus();
                            textarea.setSelectionRange(lineStart, lineStart);
                        });
                    } else {
                        const prefix = `\n${indent}${quoteSymbol} `;
                        const nextValue = `${value.slice(0, start)}${prefix}${value.slice(end)}`;
                        const newPos = start + prefix.length;
                        recordHistory(nextValue, newPos, newPos);
                        requestAnimationFrame(() => {
                            textarea.focus();
                            textarea.setSelectionRange(newPos, newPos);
                        });
                    }
                    return;
                }
            }
        }
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
                {tools.map(({ label, icon: Icon, before, after, placeholder }) => (
                    <button
                        key={label}
                        type="button"
                        title={label}
                        onClick={() => insertOrWrap(before, after, placeholder)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900 hover:shadow-sm"
                    >
                        <Icon className="h-4 w-4" />
                    </button>
                ))}
                {enableImageUpload && (
                    <>
                        <button
                            type="button"
                            title="이미지 삽입"
                            disabled={uploadingImage}
                            onClick={() => imageInputRef.current?.click()}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900 hover:shadow-sm disabled:opacity-50"
                        >
                            {uploadingImage ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <ImagePlus className="h-4 w-4" />
                            )}
                        </button>
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept={IMAGE_ACCEPT_TYPES.join(',')}
                            className="hidden"
                            onChange={(event) => handleImageSelected(event.target.files?.[0])}
                        />
                    </>
                )}
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                    <Eye className="h-3.5 w-3.5" /> 실시간 미리보기
                </span>
            </div>
            <div className="grid min-h-[140px] grid-cols-1 lg:grid-cols-2">
                <textarea
                    ref={textareaRef}
                    required
                    value={value}
                    onChange={(event) => {
                        const textarea = textareaRef.current;
                        const selStart = textarea?.selectionStart ?? event.target.value.length;
                        const selEnd = textarea?.selectionEnd ?? event.target.value.length;
                        recordHistory(event.target.value, selStart, selEnd);
                    }}
                    onKeyDown={handleKeyDown}
                    spellCheck={false}
                    placeholder="# 학습 내용&#10;&#10;Markdown으로 기록해 보세요."
                    className="min-h-[140px] resize-none overflow-hidden border-0 bg-slate-950 p-5 font-mono text-sm leading-7 text-slate-100 outline-none lg:border-r lg:border-slate-200"
                />
                <article className="markdown-body min-h-[140px] space-y-4 overflow-auto p-5 text-sm text-slate-700">
                    {value ? (
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                            components={editorMarkdownComponents}
                        >
                            {preprocessMarkdown(value)}
                        </ReactMarkdown>
                    ) : (
                        <p className="text-slate-400">작성한 Markdown이 여기에 표시됩니다.</p>
                    )}
                </article>
            </div>
        </div>
    );
}
