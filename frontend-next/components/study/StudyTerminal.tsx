'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { studyApi } from '@/lib/api';
import type { Study, StudySection } from '@/lib/api/types';
import {
    SECTION_LABEL,
    groupStudiesBySectionAndTaxonomy,
    type StudyCategoryGroup,
    type StudySectionGroup,
} from '@/lib/studyCategoryGroups';

type Props = {
    workspaceSlug?: string;
    previewMode?: boolean;
    initialStudies: Study[];
    onClose: () => void;
};

type OutputEntry =
    | { kind: 'banner' }
    | { kind: 'command'; text: string }
    | { kind: 'text'; text: string; tone?: 'error' | 'muted' | 'accent' }
    | { kind: 'link'; text: string; slug: string }
    | { kind: 'dir'; text: string; target: string[] };

const HELP_TEXT = [
    'ls [-la]         현재 위치의 항목 나열 (파란 항목 클릭하면 이동/열람)',
    'cd <dir>          디렉토리 이동 (cd .. / cd ~)',
    'pwd                현재 경로 출력',
    'cat <file>        study 미리보기',
    'open <file>       study 상세 페이지 열기',
    'grep <keyword>     (find도 동일) 전체 검색',
    'clear              화면 지우기',
    'whoami             ?',
    'exit               터미널 닫기 (Esc도 가능)',
    '',
    'Tab 키로 명령어·경로 자동완성, ↑/↓로 이전 명령 다시 불러오기',
];

const COMMANDS = [
    'ls',
    'cd',
    'pwd',
    'cat',
    'open',
    'grep',
    'find',
    'clear',
    'help',
    'whoami',
    'sudo',
    'exit',
];

function slugifyLabel(label: string): string {
    return label.trim().replace(/\s+/g, '-').replace(/\//g, '-');
}

function fileName(study: Study): string {
    return `${study.slug}.md`;
}

export function StudyTerminal({
    workspaceSlug,
    previewMode = false,
    initialStudies,
    onClose,
}: Props) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { data: allStudies } = useQuery<Study[]>({
        queryKey: ['studies', 'graph-all', workspaceSlug],
        queryFn: async () => {
            const page = await (workspaceSlug
                ? studyApi.workspaceList(workspaceSlug, { size: 300 })
                : studyApi.list({ size: 300 }));
            return page.content;
        },
        enabled: !previewMode,
        initialData: previewMode ? initialStudies : undefined,
        staleTime: 60 * 1000,
    });
    const studies = allStudies ?? initialStudies;
    const sections = useMemo(() => groupStudiesBySectionAndTaxonomy(studies), [studies]);

    const [path, setPath] = useState<string[]>([]);
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number | null>(null);
    const [output, setOutput] = useState<OutputEntry[]>([{ kind: 'banner' }]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        // output뿐 아니라 자동완성 후보 줄이 뜨고 사라질 때도 높이가 바뀌어서
        // input이 화면 밖으로 밀려날 수 있다 — input 내용 변화에도 같이 반응한다.
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, [output, input, path]);

    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const findSection = (folder: string): StudySectionGroup | undefined =>
        sections.find((entry) => SECTION_LABEL[entry.section] === folder);

    const findGroup = (
        sectionGroup: StudySectionGroup,
        folder: string
    ): StudyCategoryGroup | undefined =>
        sectionGroup.groups.find((group) => slugifyLabel(group.label) === folder);

    const resolveLocation = (targetPath: string[]) => {
        if (targetPath.length === 0) return { level: 'root' as const };
        const sectionGroup = findSection(targetPath[0]);
        if (!sectionGroup) return null;
        if (targetPath.length === 1) return { level: 'section' as const, sectionGroup };
        const group = findGroup(sectionGroup, targetPath[1]);
        if (!group) return null;
        if (targetPath.length === 2) return { level: 'group' as const, sectionGroup, group };
        return null;
    };

    const promptPath = () => (path.length === 0 ? '~' : `~/${path.join('/')}`);

    const pushOutput = (...entries: OutputEntry[]) => {
        setOutput((current) => [...current, ...entries]);
    };

    const listDirNames = (): string[] => {
        const location = resolveLocation(path);
        if (location?.level === 'root')
            return sections.map((entry) => SECTION_LABEL[entry.section]);
        if (location?.level === 'section')
            return location.sectionGroup.groups.map((group) => slugifyLabel(group.label));
        return [];
    };

    const listFileNames = (): string[] => {
        const location = resolveLocation(path);
        return location?.level === 'group' ? location.group.items.map(fileName) : [];
    };

    // Tab/자동완성 후보 목록. 첫 토큰이면 명령어, 그 뒤면 명령에 맞는 디렉토리/파일명에서 찾는다.
    const completionCandidates = useMemo(() => {
        const tokens = input.split(' ');
        const partial = tokens[tokens.length - 1] ?? '';
        if (tokens.length <= 1) {
            return COMMANDS.filter((command) => command.startsWith(partial));
        }
        const cmd = tokens[0];
        let pool: string[] = [];
        if (cmd === 'cd' || cmd === 'ls') pool = listDirNames();
        else if (cmd === 'cat' || cmd === 'open') pool = [...listDirNames(), ...listFileNames()];
        else return [];
        return pool.filter((name) => name.toLowerCase().startsWith(partial.toLowerCase()));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [input, path, sections]);

    const applyCompletion = (candidate: string) => {
        const tokens = input.split(' ');
        tokens[tokens.length - 1] = candidate;
        setInput(`${tokens.join(' ')} `);
        inputRef.current?.focus();
    };

    const runQuickCommand = (command: string) => {
        setHistory((current) => [...current, command]);
        setHistoryIndex(null);
        runCommand(command);
        inputRef.current?.focus();
    };

    const openStudy = (study: Study) => {
        onClose();
        router.push(
            `${workspaceSlug ? `/workspace/${encodeURIComponent(workspaceSlug)}` : ''}/study/${encodeURIComponent(study.slug)}`
        );
    };

    const findFileInGroup = (group: StudyCategoryGroup, name: string) => {
        const needle = name.endsWith('.md') ? name : `${name}.md`;
        return group.items.find((study) => fileName(study) === needle);
    };

    const runCommand = (raw: string) => {
        const trimmed = raw.trim();
        pushOutput({ kind: 'command', text: `guest@study:${promptPath()}$ ${raw}` });
        if (!trimmed) return;

        const [cmd, ...rest] = trimmed.split(/\s+/);
        const arg = rest.join(' ');

        switch (cmd) {
            case 'help': {
                pushOutput(...HELP_TEXT.map((line): OutputEntry => ({ kind: 'text', text: line })));
                return;
            }
            case 'clear': {
                setOutput([]);
                return;
            }
            case 'exit':
            case 'q': {
                onClose();
                return;
            }
            case 'pwd': {
                pushOutput({ kind: 'text', text: path.length === 0 ? '/' : `/${path.join('/')}` });
                return;
            }
            case 'whoami': {
                pushOutput({
                    kind: 'text',
                    text: '그냥 지나가던 방문자 (sudo 쳐봐야 소용없음)',
                    tone: 'accent',
                });
                return;
            }
            case 'sudo': {
                pushOutput({
                    kind: 'text',
                    text: 'Nice try. This incident will be reported. (사실 아무 일도 안 일어남)',
                    tone: 'error',
                });
                return;
            }
            case 'cd': {
                if (!arg || arg === '~' || arg === '/') {
                    setPath([]);
                    return;
                }
                let next = [...path];
                for (const segment of arg.split('/')) {
                    if (segment === '' || segment === '.') continue;
                    if (segment === '..') {
                        next = next.slice(0, -1);
                        continue;
                    }
                    const location = resolveLocation(next);
                    if (location?.level === 'root' && findSection(segment)) {
                        next = [...next, segment];
                        continue;
                    }
                    if (
                        location?.level === 'section' &&
                        findGroup(location.sectionGroup, segment)
                    ) {
                        next = [...next, segment];
                        continue;
                    }
                    pushOutput({
                        kind: 'text',
                        text: `bash: cd: ${arg}: No such file or directory`,
                        tone: 'error',
                    });
                    return;
                }
                setPath(next);
                return;
            }
            case 'ls': {
                const showDetail = rest.includes('-la') || rest.includes('-l');
                const location = resolveLocation(path);
                if (!location) {
                    pushOutput({
                        kind: 'text',
                        text: 'ls: 존재하지 않는 경로입니다',
                        tone: 'error',
                    });
                    return;
                }
                if (location.level === 'root') {
                    if (sections.length === 0) {
                        pushOutput({ kind: 'text', text: '(비어 있음)', tone: 'muted' });
                        return;
                    }
                    pushOutput(
                        ...sections.map((entry): OutputEntry => ({
                            kind: 'dir',
                            text: showDetail
                                ? `drwxr-xr-x  ${String(entry.count).padStart(3, ' ')}건  ${SECTION_LABEL[entry.section]}/`
                                : `${SECTION_LABEL[entry.section]}/`,
                            target: [SECTION_LABEL[entry.section]],
                        }))
                    );
                    return;
                }
                if (location.level === 'section') {
                    if (location.sectionGroup.groups.length === 0) {
                        pushOutput({ kind: 'text', text: '(비어 있음)', tone: 'muted' });
                        return;
                    }
                    pushOutput(
                        ...location.sectionGroup.groups.map((group): OutputEntry => ({
                            kind: 'dir',
                            text: showDetail
                                ? `drwxr-xr-x  ${String(group.items.length).padStart(3, ' ')}건  ${group.label}/`
                                : `${group.label}/`,
                            target: [...path, slugifyLabel(group.label)],
                        }))
                    );
                    return;
                }
                if (location.group.items.length === 0) {
                    pushOutput({ kind: 'text', text: '(비어 있음)', tone: 'muted' });
                    return;
                }
                pushOutput(
                    ...location.group.items.map((study): OutputEntry => ({
                        kind: 'link',
                        text: showDetail
                            ? `-rw-r--r--  ${study.learnedAt}  ${fileName(study)}`
                            : fileName(study),
                        slug: study.slug,
                    }))
                );
                return;
            }
            case 'cat': {
                if (!arg) {
                    pushOutput({ kind: 'text', text: 'cat: 파일명을 입력하세요', tone: 'error' });
                    return;
                }
                const location = resolveLocation(path);
                if (location?.level !== 'group') {
                    pushOutput({
                        kind: 'text',
                        text: `cat: ${arg}: study 디렉토리 안에서만 열 수 있습니다`,
                        tone: 'error',
                    });
                    return;
                }
                const study = findFileInGroup(location.group, arg);
                if (!study) {
                    pushOutput({
                        kind: 'text',
                        text: `cat: ${arg}: No such file or directory`,
                        tone: 'error',
                    });
                    return;
                }
                pushOutput(
                    { kind: 'text', text: `# ${study.title}`, tone: 'accent' },
                    { kind: 'text', text: study.summary },
                    {
                        kind: 'text',
                        text: study.tags.map((tag) => `#${tag.name}`).join(' '),
                        tone: 'muted',
                    },
                    { kind: 'text', text: '' },
                    {
                        kind: 'link',
                        text: `open ${fileName(study)} 로 전체 글 열기 →`,
                        slug: study.slug,
                    }
                );
                return;
            }
            case 'open': {
                if (!arg) {
                    pushOutput({ kind: 'text', text: 'open: 파일명을 입력하세요', tone: 'error' });
                    return;
                }
                const location = resolveLocation(path);
                const study =
                    location?.level === 'group' ? findFileInGroup(location.group, arg) : undefined;
                if (!study) {
                    pushOutput({
                        kind: 'text',
                        text: `open: ${arg}: No such file or directory`,
                        tone: 'error',
                    });
                    return;
                }
                openStudy(study);
                return;
            }
            case 'grep':
            case 'find': {
                if (!arg) {
                    pushOutput({ kind: 'text', text: `usage: ${cmd} <keyword>`, tone: 'error' });
                    return;
                }
                const keyword = arg.toLowerCase();
                const matches = sections.flatMap((entry) =>
                    entry.groups.flatMap((group) =>
                        group.items
                            .filter((study) =>
                                [
                                    study.title,
                                    study.summary,
                                    ...study.tags.map((tag) => tag.name),
                                    ...study.skills.map((skill) => skill.name),
                                ]
                                    .join(' ')
                                    .toLowerCase()
                                    .includes(keyword)
                            )
                            .map((study) => ({ entry, group, study }))
                    )
                );
                if (matches.length === 0) {
                    pushOutput({
                        kind: 'text',
                        text: `${cmd}: '${arg}' 검색 결과 없음`,
                        tone: 'muted',
                    });
                    return;
                }
                pushOutput(
                    { kind: 'text', text: `${matches.length}건 찾음`, tone: 'muted' },
                    ...matches.map(({ entry, group, study }): OutputEntry => ({
                        kind: 'link',
                        text: `./${SECTION_LABEL[entry.section]}/${group.label}/${fileName(study)}`,
                        slug: study.slug,
                    }))
                );
                return;
            }
            default: {
                pushOutput({ kind: 'text', text: `command not found: ${cmd}`, tone: 'error' });
            }
        }
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (input.trim()) {
            setHistory((current) => [...current, input]);
        }
        setHistoryIndex(null);
        runCommand(input);
        setInput('');
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Tab') {
            event.preventDefault();
            if (completionCandidates.length === 1) {
                applyCompletion(completionCandidates[0]);
            } else if (completionCandidates.length > 1) {
                const tokens = input.split(' ');
                const partial = tokens[tokens.length - 1] ?? '';
                const common = completionCandidates.reduce((prefix, candidate) => {
                    let i = 0;
                    while (
                        i < prefix.length &&
                        candidate.toLowerCase().startsWith(prefix.slice(0, i + 1).toLowerCase())
                    )
                        i += 1;
                    return prefix.slice(0, i);
                }, completionCandidates[0]);
                if (common.length > partial.length) {
                    tokens[tokens.length - 1] = common;
                    setInput(tokens.join(' '));
                } else {
                    pushOutput({
                        kind: 'text',
                        text: completionCandidates.join('   '),
                        tone: 'muted',
                    });
                }
            }
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (history.length === 0) return;
            const nextIndex =
                historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
            setHistoryIndex(nextIndex);
            setInput(history[nextIndex]);
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (historyIndex === null) return;
            const nextIndex = historyIndex + 1;
            if (nextIndex >= history.length) {
                setHistoryIndex(null);
                setInput('');
            } else {
                setHistoryIndex(nextIndex);
                setInput(history[nextIndex]);
            }
        }
    };

    const toneClass = (tone?: 'error' | 'muted' | 'accent') => {
        if (tone === 'error') return 'text-rose-400';
        if (tone === 'muted') return 'text-emerald-700';
        if (tone === 'accent') return 'text-emerald-300';
        return 'text-emerald-400';
    };

    return (
        <div className="flex h-[680px] flex-col overflow-hidden rounded-lg border border-emerald-900/60 bg-black shadow-sm">
            <div className="flex shrink-0 items-center justify-between border-b border-emerald-900/60 bg-emerald-950/30 px-4 py-2">
                <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                    <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-3 font-mono text-xs text-emerald-500/70">
                        guest@study — studyOS
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md p-1 text-emerald-500/70 transition hover:bg-emerald-900/40 hover:text-emerald-200"
                    aria-label="터미널 나가기"
                    title="터미널 나가기 (다른 뷰로 전환)"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div
                ref={scrollRef}
                onClick={() => inputRef.current?.focus()}
                className="flex-1 overflow-y-auto p-4 font-mono text-sm leading-relaxed"
            >
                {output.map((entry, index) => {
                    if (entry.kind === 'banner') {
                        return (
                            <pre key={index} className="mb-3 text-emerald-500/80">
                                {`   _____ __            __         ____  _____
  / ___// /___  ______/ /_  __   / __ \\/ ___/
  \\__ \\/ __/ / / / __  / / / /  / / / /\\__ \\
 ___/ / /_/ /_/ / /_/ / /_/ /  / /_/ /___/ /
/____/\\__/\\__,_/\\__,_/\\__, /   \\____//____/
                     /____/`}
                                <br />
                                studyOS v1.0 — 'help' 입력해서 명령어 확인, Esc로 닫기
                            </pre>
                        );
                    }
                    if (entry.kind === 'command') {
                        return (
                            <div key={index} className="text-slate-200">
                                {entry.text}
                            </div>
                        );
                    }
                    if (entry.kind === 'link') {
                        return (
                            <button
                                key={index}
                                type="button"
                                onClick={() => {
                                    const study = studies.find((item) => item.slug === entry.slug);
                                    if (study) openStudy(study);
                                }}
                                className="block text-left text-sky-400 underline decoration-sky-800 underline-offset-2 hover:text-sky-300"
                            >
                                {entry.text}
                            </button>
                        );
                    }
                    if (entry.kind === 'dir') {
                        return (
                            <button
                                key={index}
                                type="button"
                                onClick={() => setPath(entry.target)}
                                className="block text-left text-emerald-300 hover:text-emerald-100 hover:underline"
                            >
                                {entry.text}
                            </button>
                        );
                    }
                    return (
                        <div key={index} className={toneClass(entry.tone)}>
                            {entry.text || '\u00A0'}
                        </div>
                    );
                })}

                <form onSubmit={handleSubmit} className="mt-1 flex items-center gap-1.5">
                    <span className="shrink-0 text-emerald-400">guest@study:{promptPath()}$</span>
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={handleKeyDown}
                        spellCheck={false}
                        autoComplete="off"
                        className="flex-1 bg-transparent text-emerald-100 outline-none caret-emerald-400"
                    />
                </form>

                {input.trim() && completionCandidates.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5 pl-0">
                        {completionCandidates.map((candidate) => (
                            <button
                                key={candidate}
                                type="button"
                                onClick={() => applyCompletion(candidate)}
                                className="rounded border border-emerald-800 bg-emerald-950/60 px-1.5 py-0.5 text-[11px] text-emerald-300 hover:border-emerald-500 hover:text-emerald-100"
                            >
                                {candidate}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="shrink-0 border-t border-emerald-900/60 bg-emerald-950/20 px-4 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 font-mono text-[11px] text-emerald-700">
                        명령어 잘 모르겠으면:
                    </span>
                    {[
                        ['help', '전체 명령어 보기'],
                        ['ls', '지금 위치 보기'],
                        ...(path.length > 0 ? [['cd ..', '한 단계 위로']] : []),
                    ].map(([command, label]) => (
                        <button
                            key={command}
                            type="button"
                            onClick={() => runQuickCommand(command)}
                            className="rounded-full border border-emerald-800 bg-black px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-300 transition hover:border-emerald-500 hover:text-emerald-100"
                            title={label}
                        >
                            {command}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
