'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Loader2 } from 'lucide-react';

export type AiStageProgress = { stage: number; message: string; buffer: string; done: boolean };
export type AiReadableLine = { label: string; text: string; done: boolean };

export function useAiSuggestionStream() {
    const [aiStages, setAiStages] = useState<AiStageProgress[]>([]);
    const [aiError, setAiError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const chatRef = useRef<HTMLDivElement | null>(null);

    const reset = () => {
        abortRef.current?.abort();
        abortRef.current = null;
        setAiStages([]);
        setAiError(null);
        setIsGenerating(false);
    };

    useEffect(() => () => abortRef.current?.abort(), []);

    useEffect(() => {
        const container = chatRef.current;
        if (container && isGenerating) container.scrollTop = container.scrollHeight;
    }, [aiStages, isGenerating]);

    const pushStage = (stage: number, message: string) => {
        setAiStages((current) => [
            ...current.map((item) => ({ ...item, done: true })),
            { stage, message, buffer: '', done: false },
        ]);
    };

    const appendToken = (stage: number, text: string) => {
        setAiStages((current) =>
            current.map((item) =>
                item.stage === stage ? { ...item, buffer: item.buffer + text } : item
            )
        );
    };

    const finishStages = () =>
        setAiStages((current) => current.map((item) => ({ ...item, done: true })));

    return {
        aiStages,
        aiError,
        setAiError,
        isGenerating,
        setIsGenerating,
        abortRef,
        chatRef,
        reset,
        pushStage,
        appendToken,
        finishStages,
    };
}

export function AiStageBubble({
    stage,
    fieldLabels,
    extra,
}: {
    stage: AiStageProgress;
    fieldLabels: Record<string, string>;
    extra?: ReactNode;
}) {
    const lines = extractAiReadableLines(stage.buffer, fieldLabels);
    return (
        <div className="flex items-start gap-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-600">
                {stage.done ? (
                    <Check className="h-3.5 w-3.5" />
                ) : (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
            </span>
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-violet-50 px-3.5 py-2.5">
                <p className="text-xs font-black text-violet-900">
                    {stage.stage}단계 · {stage.message}
                    {stage.done ? ' — 완료' : '...'}
                </p>
                {lines.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                        {lines.map((line, index) => (
                            <li key={index} className="text-xs leading-relaxed text-slate-600">
                                <span className="mr-1 font-bold text-violet-600">{line.label}</span>
                                {line.text}
                                {!line.done && (
                                    <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse rounded-sm bg-violet-400 align-middle" />
                                )}
                            </li>
                        ))}
                    </ul>
                )}
                {extra}
            </div>
        </div>
    );
}

export function extractAiReadableLines(
    buffer: string,
    fieldLabels: Record<string, string>
): AiReadableLine[] {
    const fieldNames = Object.keys(fieldLabels).join('|');
    const completedPattern = new RegExp(`"(${fieldNames})"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'g');
    const partialPattern = new RegExp(`"(${fieldNames})"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)$`);
    const lines: AiReadableLine[] = [];
    let tailIndex = 0;
    for (let match = completedPattern.exec(buffer); match; match = completedPattern.exec(buffer)) {
        const text = unescapeJsonText(match[2]);
        if (text) lines.push({ label: fieldLabels[match[1]], text, done: true });
        tailIndex = completedPattern.lastIndex;
    }
    const partial = partialPattern.exec(buffer.slice(tailIndex));
    if (partial)
        lines.push({
            label: fieldLabels[partial[1]],
            text: unescapeJsonText(partial[2]),
            done: false,
        });
    return lines;
}

export function unescapeJsonText(value: string): string {
    try {
        return JSON.parse(`"${value}"`) as string;
    } catch {
        return value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
}
