'use client';

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
    ArrowDown,
    ArrowUp,
    Briefcase,
    Cpu,
    FolderGit2,
    GraduationCap,
    MoveVertical,
    Sparkles,
    Settings,
    Plus,
} from 'lucide-react';
import type {
    IntroductionResponse,
    PrintTemplate,
    PrintTemplateContentOverrides,
} from '@/lib/api/types';
import {
    buildCareerCards,
    buildMilestones,
    buildOrderedCredentials,
    groupCoreSkills,
} from '@/lib/introDerivations';
import { credentialKindLabel, formatCredentialPeriod } from '@/lib/format';
import { resumeMarkdownComponents } from '@/lib/markdown';
import { partitionAtomsIntoPages, type PrintAtomItem } from '@/lib/pdfLayoutEngine';
import {
    printableSections,
    LOCKED_PRINT_SECTION_ID,
    reorderablePrintSections,
} from '@/lib/printSections';
import { generateUniqueLocalName, getLocalSaves, saveLocal } from '@/lib/printTemplateLocal';
import {
    applyPrintTemplateContent,
    getPrintContentFingerprint,
    sanitizePrintTemplate,
} from '@/lib/printTemplateContent';
import { usePrintStore } from '@/store/usePrintStore';
import { PdfPageLayer } from './PdfPageLayer';
import { PrintPreviewBar } from './PrintPreviewBar';
import { PrintPreviewNav } from './PrintPreviewNav';
import { PrintEyeButton } from './PrintEyeButton';
import { PrintModeModal } from './PrintModeModal';
import { SaveServerTemplateModal } from './SaveServerTemplateModal';
import { PrintSkillSelectorModal } from './PrintSkillSelectorModal';

type Props = {
    introData: IntroductionResponse;
    onExit: () => void;
    adminMode?: boolean;
    initialTemplate?: PrintTemplate | null;
};

function renderDetailFields(
    detail: {
        id?: number;
        narrative?: string;
        situation?: string;
        actionDetail?: string;
        outcome?: string;
    },
    inlineEditMode: boolean,
    origNarrative: string,
    onNarrativeChange: (val: string | undefined) => void,
    renderInlineTextHelper: (opts: {
        value: string;
        baseValue: string;
        multiline?: boolean;
        textClassName?: string;
        placeholder?: string;
        onChange: (newValue: string | undefined) => void;
    }) => React.ReactNode
) {
    const merged =
        detail.narrative ||
        [detail.situation, detail.actionDetail, detail.outcome].filter(Boolean).join('\n\n');
    if (!merged && !inlineEditMode) return null;

    if (inlineEditMode) {
        return (
            <div className="resume-detail-text mt-1 text-[12px] leading-relaxed text-slate-600">
                {renderInlineTextHelper({
                    value: detail.narrative ?? merged ?? '',
                    baseValue: origNarrative,
                    multiline: true,
                    textClassName: 'text-[12px] leading-relaxed text-slate-600',
                    placeholder: '상세 성과 및 기술적 설명을 입력하세요',
                    onChange: onNarrativeChange,
                })}
            </div>
        );
    }

    return (
        <div className="resume-detail-text mt-1 text-[12px] leading-relaxed text-slate-600">
            <ReactMarkdown components={resumeMarkdownComponents}>{merged}</ReactMarkdown>
        </div>
    );
}

export function PrintCanvas({
    introData,
    onExit,
    adminMode = false,
    initialTemplate = null,
}: Props) {
    const store = usePrintStore();
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const printLayoutFrozenRef = useRef(false);
    const dragRef = useRef<{ kind: 'section'; id: string } | null>(null);
    const [inlineEditMode, setInlineEditMode] = useState(false);
    const [modeModalOpen, setModeModalOpen] = useState(
        () => !store.printModeResolved && !initialTemplate
    );
    const [activeTemplate, setActiveTemplate] = useState<PrintTemplate | null>(initialTemplate);
    const [activeTemplateName, setActiveTemplateName] = useState<string>(() => {
        if (initialTemplate) return initialTemplate.name;
        return '기본 이력서';
    });

    const updateUrlParams = (tmplId: number | null) => {
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        if (tmplId != null) {
            url.searchParams.set('templateId', String(tmplId));
        } else {
            url.searchParams.delete('templateId');
        }
        window.history.replaceState(null, '', url.toString());
    };
    const sanitizedInitialTemplate = useMemo(
        () => (initialTemplate ? sanitizePrintTemplate(initialTemplate, introData) : null),
        [initialTemplate, introData]
    );
    const [contentOverrides, setContentOverrides] = useState<PrintTemplateContentOverrides>(
        () => sanitizedInitialTemplate?.contentOverrides ?? {}
    );
    const resolvedIntroData = useMemo(
        () => applyPrintTemplateContent(introData, contentOverrides),
        [introData, contentOverrides]
    );

    function AutoResizingTextarea({
        value,
        onChange,
        placeholder,
        className = '',
    }: {
        value: string;
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
        placeholder?: string;
        className?: string;
    }) {
        const textareaRef = useRef<HTMLTextAreaElement | null>(null);

        useLayoutEffect(() => {
            const el = textareaRef.current;
            if (el) {
                el.style.height = 'auto';
                el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
            }
        }, [value]);

        return (
            <textarea
                ref={textareaRef}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`resize-none overflow-hidden ${className}`}
            />
        );
    }

    const setProfileOverride = (
        field: 'jobTitle' | 'bio' | 'coreStackSummary',
        val: string | undefined
    ) => {
        setContentOverrides((current) => {
            const next = JSON.parse(JSON.stringify(current)) as PrintTemplateContentOverrides;
            const prof = { ...(next.profile ?? {}) };
            const baseVal = introData.profile?.[field] ?? '';
            if (val === undefined || (val !== '' && val.trim() === baseVal.trim())) {
                delete prof[field];
            } else {
                prof[field] = val;
            }
            next.profile = Object.keys(prof).length > 0 ? prof : undefined;
            return next;
        });
    };

    const setExperienceOverride = (
        expId: number,
        field: 'title' | 'summary' | 'role' | 'takeaway',
        val: string | undefined,
        baseVal: string
    ) => {
        setContentOverrides((current) => {
            const next = JSON.parse(JSON.stringify(current)) as PrintTemplateContentOverrides;
            const expMap = { ...(next.experiences ?? {}) };
            const fields = { ...(expMap[String(expId)] ?? {}) };
            if (val === undefined || val.trim() === baseVal.trim()) delete fields[field];
            else fields[field] = val;
            if (Object.keys(fields).length > 0) expMap[String(expId)] = fields;
            else delete expMap[String(expId)];
            next.experiences = Object.keys(expMap).length > 0 ? expMap : undefined;
            return next;
        });
    };

    const setDetailOverride = (
        detailId: number,
        field: 'content' | 'narrative',
        val: string | undefined,
        baseVal: string
    ) => {
        setContentOverrides((current) => {
            const next = JSON.parse(JSON.stringify(current)) as PrintTemplateContentOverrides;
            const detailMap = { ...(next.details ?? {}) };
            const fields = { ...(detailMap[String(detailId)] ?? {}) };
            if (val === undefined || val.trim() === baseVal.trim()) delete fields[field];
            else fields[field] = val;
            if (Object.keys(fields).length > 0) detailMap[String(detailId)] = fields;
            else delete detailMap[String(detailId)];
            next.details = Object.keys(detailMap).length > 0 ? detailMap : undefined;
            return next;
        });
    };

    const setCompetencyOverride = (
        compId: number,
        field: 'title' | 'summary',
        val: string | undefined,
        baseVal: string
    ) => {
        setContentOverrides((current) => {
            const next = JSON.parse(JSON.stringify(current)) as PrintTemplateContentOverrides;
            const compMap = { ...(next.competencies ?? {}) };
            const fields = { ...(compMap[String(compId)] ?? {}) };
            if (val === undefined || val.trim() === baseVal.trim()) delete fields[field];
            else fields[field] = val;
            if (Object.keys(fields).length > 0) compMap[String(compId)] = fields;
            else delete compMap[String(compId)];
            next.competencies = Object.keys(compMap).length > 0 ? compMap : undefined;
            return next;
        });
    };

    const [skillSelectorModalOpen, setSkillSelectorModalOpen] = useState(false);

    const toggleSkillSelection = (skillId: number) => {
        setContentOverrides((current) => {
            const defaultCoreSkillIds = introData.skills.filter((s) => s.isCore).map((s) => s.id);
            const currentSelected = current.selectedSkillIds ?? defaultCoreSkillIds;

            let nextSelected: number[];
            if (currentSelected.includes(skillId)) {
                nextSelected = currentSelected.filter((id) => id !== skillId);
            } else {
                nextSelected = [...currentSelected, skillId];
            }

            const isDefaultState =
                defaultCoreSkillIds.length === nextSelected.length &&
                defaultCoreSkillIds.every((id) => nextSelected.includes(id));

            return {
                ...current,
                selectedSkillIds: isDefaultState ? undefined : nextSelected,
            };
        });
    };

    const selectAllSkillsInGroup = (skillIds: number[]) => {
        setContentOverrides((current) => {
            const defaultCoreSkillIds = introData.skills.filter((s) => s.isCore).map((s) => s.id);
            const currentSelected = current.selectedSkillIds ?? defaultCoreSkillIds;
            const set = new Set([...currentSelected, ...skillIds]);
            const nextSelected = Array.from(set);

            const isDefaultState =
                defaultCoreSkillIds.length === nextSelected.length &&
                defaultCoreSkillIds.every((id) => nextSelected.includes(id));

            return {
                ...current,
                selectedSkillIds: isDefaultState ? undefined : nextSelected,
            };
        });
    };

    const deselectAllSkillsInGroup = (skillIds: number[]) => {
        setContentOverrides((current) => {
            const defaultCoreSkillIds = introData.skills.filter((s) => s.isCore).map((s) => s.id);
            const currentSelected = current.selectedSkillIds ?? defaultCoreSkillIds;
            const deselectSet = new Set(skillIds);
            const nextSelected = currentSelected.filter((id) => !deselectSet.has(id));

            const isDefaultState =
                defaultCoreSkillIds.length === nextSelected.length &&
                defaultCoreSkillIds.every((id) => nextSelected.includes(id));

            return {
                ...current,
                selectedSkillIds: isDefaultState ? undefined : nextSelected,
            };
        });
    };

    const resetSkillsToAll = () => {
        setContentOverrides((current) => ({
            ...current,
            selectedSkillIds: undefined,
        }));
    };

    const renderInlineText = ({
        value,
        baseValue,
        multiline = false,
        textClassName = '',
        placeholder = '',
        onChange,
    }: {
        value: string;
        baseValue: string;
        multiline?: boolean;
        textClassName?: string;
        placeholder?: string;
        onChange: (newValue: string | undefined) => void;
    }) => {
        const isOverridden = value !== baseValue;

        if (!inlineEditMode) {
            return <span className={textClassName}>{value}</span>;
        }

        return (
            <span className="group/edit relative inline-block w-full max-w-full my-0.5">
                {multiline ? (
                    <AutoResizingTextarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className={`w-full rounded-md border-2 border-blue-400 bg-blue-50/70 p-2 text-xs leading-relaxed text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${textClassName}`}
                    />
                ) : (
                    <input
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className={`w-full rounded-md border-2 border-blue-400 bg-blue-50/70 px-2 py-1 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${textClassName}`}
                    />
                )}
                {isOverridden && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onChange(undefined);
                        }}
                        className="absolute -top-3.5 right-1 z-30 inline-flex items-center gap-1 rounded bg-amber-500 px-1.5 py-0.2 text-[9px] font-black text-white shadow-xs hover:bg-amber-600 transition print:hidden"
                        title={`최신 DB 원본 문구로 복원: "${baseValue}"`}
                    >
                        DB 원본 복원
                    </button>
                )}
            </span>
        );
    };

    const profile = resolvedIntroData.profile;
    const careerSummary = resolvedIntroData.careerSummary;
    const groupedCoreSkills = useMemo(
        () => groupCoreSkills(resolvedIntroData.skills),
        [resolvedIntroData]
    );
    const orderedCareerCards = useMemo(
        () => buildCareerCards(resolvedIntroData.experiences),
        [resolvedIntroData]
    );
    const orderedCompetencies = useMemo(
        () => resolvedIntroData.competencies.filter((c) => c.visible),
        [resolvedIntroData]
    );
    const orderedMilestones = useMemo(
        () => buildMilestones(resolvedIntroData),
        [resolvedIntroData]
    );
    const orderedCredentialExperiences = useMemo(
        () => buildOrderedCredentials(resolvedIntroData.experiences),
        [resolvedIntroData]
    );

    useEffect(() => {
        if (!sanitizedInitialTemplate) return;
        const rawGaps = sanitizedInitialTemplate.sectionGaps as Record<string, unknown>;
        const { __forcedPageOverrides, ...pureGaps } = rawGaps;
        store.applyTemplate({
            excludedIds: sanitizedInitialTemplate.excludedIds,
            sectionOrder: sanitizedInitialTemplate.sectionOrder,
            sectionGaps: pureGaps as Record<string, number>,
            forcedPageOverrides:
                __forcedPageOverrides && typeof __forcedPageOverrides === 'object'
                    ? (__forcedPageOverrides as Record<string, number>)
                    : {},
        });
        // 초기 템플릿은 이 컴포넌트가 마운트될 때 한 번만 적용한다.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sanitizedInitialTemplate?.id]);

    // 캔버스 마우스 휠 + Ctrl/Cmd로 줌 조절
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = -e.deltaY;
                store.setZoom(store.zoom + (delta > 0 ? 0.05 : -0.05));
            }
        };
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.zoom]);

    const handleZoomFit = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const canvasWidth = canvas.clientWidth;
        const padding = 64;
        const fitZoom = (canvasWidth - padding) / 794;
        store.setZoom(fitZoom);
    };

    useEffect(() => {
        const clearPrintTitle = () => {
            printLayoutFrozenRef.current = true;
        };
        const restorePrintTitle = () => {
            printLayoutFrozenRef.current = false;
            store.setPrintPending(false);
        };
        window.addEventListener('beforeprint', clearPrintTitle);
        window.addEventListener('afterprint', restorePrintTitle);
        return () => {
            window.removeEventListener('beforeprint', clearPrintTitle);
            window.removeEventListener('afterprint', restorePrintTitle);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const orderedReorderableSections = store.printSectionOrder
        .map((id) => reorderablePrintSections.find((s) => s.id === id))
        .filter((s): s is (typeof reorderablePrintSections)[number] => Boolean(s));
    const lockedPrintSection = printableSections.find((s) => s.id === LOCKED_PRINT_SECTION_ID)!;
    const orderedPrintableSections = [lockedPrintSection, ...orderedReorderableSections];
    const orderedSectionIdsKey = orderedPrintableSections.map((s) => s.id).join(',');

    const printableAtoms = useMemo(() => {
        const atoms: PrintAtomItem[] = [];
        orderedPrintableSections.forEach((section) => {
            if (store.printExcludedIds.includes(section.id)) return;

            if (section.id === 'intro-profile') {
                atoms.push({
                    id: 'intro-profile',
                    type: 'intro-profile',
                    sectionId: 'intro-profile',
                });
            } else if (section.id === 'skills') {
                atoms.push({
                    id: 'skills-header',
                    type: 'skills',
                    sectionId: 'skills',
                    isHeader: true,
                });
                groupedCoreSkills.forEach((group) => {
                    const groupId = `skills-group:${group.value}`;
                    if (!store.printExcludedIds.includes(groupId)) {
                        atoms.push({
                            id: groupId,
                            type: 'skills-group',
                            sectionId: 'skills',
                            dataId: group.value,
                        });
                    }
                });
            } else if (section.id === 'competencies') {
                atoms.push({
                    id: 'competencies-header',
                    type: 'competency-header',
                    sectionId: 'competencies',
                    isHeader: true,
                });
                orderedCompetencies.forEach((c) => {
                    const id = `competency:${c.id}`;
                    if (!store.printExcludedIds.includes(id)) {
                        atoms.push({
                            id,
                            type: 'competency-item',
                            sectionId: 'competencies',
                            dataId: c.id,
                        });
                    }
                });
            } else if (section.id === 'career') {
                atoms.push({
                    id: 'career-header',
                    type: 'career-header',
                    sectionId: 'career',
                    isHeader: true,
                });
                orderedCareerCards.forEach((career) => {
                    atoms.push({
                        id: `career-company:${career.id}`,
                        type: 'career-company',
                        sectionId: 'career',
                        dataId: career.id,
                    });
                    career.projects.forEach((p) => {
                        const headerId = `career-project:${p.id}`;
                        if (!store.printExcludedIds.includes(headerId)) {
                            atoms.push({
                                id: headerId,
                                type: 'career-item',
                                sectionId: 'career',
                                dataId: p.id,
                            });
                            p.details?.forEach((detail) => {
                                const detailId = `career-detail:${detail.id}`;
                                if (!store.printExcludedIds.includes(detailId)) {
                                    atoms.push({
                                        id: detailId,
                                        type: 'career-detail-item',
                                        sectionId: 'career',
                                        dataId: detail.id,
                                        title: detail.content,
                                    });
                                }
                            });
                        }
                    });
                });
            } else if (section.id === 'credentials') {
                atoms.push({
                    id: 'credentials-header',
                    type: 'credentials-header',
                    sectionId: 'credentials',
                    isHeader: true,
                });
                orderedCredentialExperiences.forEach((cred) => {
                    const id = `credential:${cred.id}`;
                    if (!store.printExcludedIds.includes(id)) {
                        atoms.push({
                            id,
                            type: 'credential-item',
                            sectionId: 'credentials',
                            dataId: cred.id,
                        });
                    }
                });
            } else if (section.id === 'projects') {
                atoms.push({
                    id: 'projects-header',
                    type: 'projects-header',
                    sectionId: 'projects',
                    isHeader: true,
                });
                orderedMilestones.forEach((m) => {
                    const headerId = `project:${m.id}`;
                    if (!store.printExcludedIds.includes(headerId)) {
                        atoms.push({
                            id: headerId,
                            type: 'project-item',
                            sectionId: 'projects',
                            dataId: m.id,
                        });
                        m.details?.forEach((detail) => {
                            const detailId = `project-detail:${detail.id}`;
                            if (!store.printExcludedIds.includes(detailId)) {
                                atoms.push({
                                    id: detailId,
                                    type: 'project-detail-item',
                                    sectionId: 'projects',
                                    dataId: detail.id,
                                    title: detail.content,
                                });
                            }
                        });
                    }
                });
            }
        });
        return atoms;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        store.printExcludedIds,
        orderedSectionIdsKey,
        groupedCoreSkills,
        orderedCompetencies,
        orderedCareerCards,
        orderedCredentialExperiences,
        orderedMilestones,
    ]);

    useLayoutEffect(() => {
        const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-atom-id]'));
        const newHeights = new Map<string, number>();
        elements.forEach((el) => {
            const atomId = el.getAttribute('data-atom-id');
            if (atomId) {
                const target =
                    el.querySelector<HTMLElement>('[data-print-el]') ||
                    (el.firstElementChild as HTMLElement) ||
                    el;
                const h =
                    target.offsetHeight ||
                    Math.round(target.getBoundingClientRect().height / (store.zoom || 1));
                if (h > 0) newHeights.set(atomId, h);
            }
        });

        const prev = store.atomHeights;
        if (prev.size !== newHeights.size) {
            store.setAtomHeights(newHeights);
            return;
        }
        for (const [id, h] of newHeights) {
            const prevH = prev.get(id);
            if (prevH === undefined || Math.abs(prevH - h) > 3) {
                store.setAtomHeights(newHeights);
                return;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [printableAtoms, store.sectionGaps]);

    const pageLayers = useMemo(
        () =>
            partitionAtomsIntoPages(
                printableAtoms,
                store.atomHeights,
                store.sectionGaps,
                store.forcedPageOverrides
            ),
        [printableAtoms, store.atomHeights, store.sectionGaps, store.forcedPageOverrides]
    );

    const atomPageMap = useMemo(() => {
        const map = new Map<string, number>();
        pageLayers.forEach((page) =>
            page.items.forEach((item) => map.set(item.id, page.pageIndex))
        );
        return map;
    }, [pageLayers]);

    const splitSectionIds = useMemo(() => {
        const sectionPagesMap = new Map<string, Set<number>>();
        printableAtoms.forEach((atom) => {
            const page = atomPageMap.get(atom.id);
            if (page !== undefined) {
                if (!sectionPagesMap.has(atom.sectionId))
                    sectionPagesMap.set(atom.sectionId, new Set());
                sectionPagesMap.get(atom.sectionId)!.add(page);
            }
        });
        const splitSet = new Set<string>();
        sectionPagesMap.forEach((pages, sectionId) => {
            if (pages.size > 1) splitSet.add(sectionId);
        });
        return splitSet;
    }, [printableAtoms, atomPageMap]);

    const pageBreakBoundaryAtomIds = useMemo(() => {
        const set = new Set<string>();
        for (let p = 1; p < pageLayers.length; p++) {
            const prevPageItems = pageLayers[p - 1].items;
            const currentPageItems = pageLayers[p].items;
            if (currentPageItems.length > 0) {
                const firstAtomOnNewPage = currentPageItems[0];
                const sectionId = firstAtomOnNewPage.sectionId;
                const hasPrevItemsInSameSection = prevPageItems.some(
                    (it) => it.sectionId === sectionId
                );
                if (hasPrevItemsInSameSection) set.add(firstAtomOnNewPage.id);
            }
        }
        return set;
    }, [pageLayers]);

    const getAssociatedAtomIds = (id: string): string[] => {
        if (id.startsWith('project-details-header:')) {
            const milestoneId = id.replace('project-details-header:', '');
            const m = orderedMilestones.find((item) => String(item.id) === milestoneId);
            if (m) return [id, ...m.details.map((d) => `project-detail:${d.id}`)];
        }
        if (id.startsWith('career-details-header:')) {
            const projectId = id.replace('career-details-header:', '');
            const p = orderedCareerCards
                .flatMap((c) => c.projects)
                .find((item) => String(item.id) === projectId);
            if (p) return [id, ...p.details.map((d) => `career-detail:${d.id}`)];
        }
        return [id];
    };

    const startGapDrag = (id: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startY = e.clientY;
        const startGap = Math.max(0, store.sectionGaps[id] ?? 0);
        const onMove = (me: MouseEvent) => {
            const next = Math.max(0, Math.round(startGap + (me.clientY - startY)));
            store.setGap(id, next);
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const getAtomDisplayTitle = (atomId: string): string => {
        if (atomId === 'intro-profile') return '소개 / 프로필';
        if (atomId === 'skills' || atomId === 'skills-group') return '기술 스택';
        if (atomId === 'competency-header' || atomId === 'competencies') return '핵심 역량';
        if (atomId === 'career-header' || atomId === 'career') return '경력 사항';
        if (atomId === 'credentials-header' || atomId === 'credentials') return '학력 / 자격증';
        if (atomId === 'projects-header' || atomId === 'projects') return '프로젝트 목록';

        if (atomId.startsWith('competency:')) {
            const compId = atomId.replace('competency:', '');
            const c = (resolvedIntroData.competencies || []).find(
                (item) => String(item.id) === compId
            );
            if (c) return `'${c.title}'`;
            return '핵심 역량 항목';
        }
        if (atomId.startsWith('career-company:')) {
            const compId = atomId.replace('career-company:', '');
            const card = orderedCareerCards.find((c) => String(c.id) === compId);
            if (card) return `'${card.companyName}'`;
            return '경력 회사';
        }
        if (atomId.startsWith('career-project:')) {
            const projId = atomId.replace('career-project:', '');
            const p = orderedCareerCards
                .flatMap((c) => c.projects)
                .find((item) => String(item.id) === projId);
            if (p) return `'${p.title}'`;
            return '경력 프로젝트';
        }
        if (atomId.startsWith('career-details-header:')) {
            const projId = atomId.replace('career-details-header:', '');
            const p = orderedCareerCards
                .flatMap((c) => c.projects)
                .find((item) => String(item.id) === projId);
            if (p) return `'${p.title}' 세부 내용`;
            return '경력 프로젝트 세부 내용';
        }
        if (atomId.startsWith('project:')) {
            const mId = atomId.replace('project:', '');
            const m = orderedMilestones.find((item) => String(item.id) === mId);
            if (m) return `'${m.title}'`;
            return '프로젝트';
        }
        if (atomId.startsWith('project-details-header:')) {
            const mId = atomId.replace('project-details-header:', '');
            const m = orderedMilestones.find((item) => String(item.id) === mId);
            if (m) return `'${m.title}' 세부 내용`;
            return '프로젝트 세부 내용';
        }
        if (atomId.startsWith('credential:')) {
            const credId = atomId.replace('credential:', '');
            const cred = orderedCredentialExperiences.find((item) => String(item.id) === credId);
            if (cred) return `'${cred.companyName || cred.role}'`;
            return '학력/자격증';
        }

        const atom = printableAtoms.find((a) => a.id === atomId);
        if (atom?.title) return `'${atom.title}'`;
        return '해당 항목';
    };

    const renderPageBreakControl = (id: string, sectionId: string) => {
        if (store.hidePrintGuides) return null;
        if (id === 'intro-profile') return null;
        const isSplit = splitSectionIds.has(sectionId);
        const isBoundary = pageBreakBoundaryAtomIds.has(id);
        const currentGap = store.sectionGaps[id] ?? 0;
        const forcedPage = store.forcedPageOverrides[id];
        const currentPage = atomPageMap.get(id);
        void isSplit;

        const itemTitle = getAtomDisplayTitle(id);

        if (forcedPage !== undefined) {
            const isChildDetail =
                id.startsWith('project-detail:') || id.startsWith('career-detail:');
            if (isChildDetail) {
                let parentHeaderId: string | null = null;
                if (id.startsWith('project-detail:')) {
                    const detailId = id.replace('project-detail:', '');
                    const m = orderedMilestones.find((item) =>
                        item.details.some((d) => String(d.id) === detailId)
                    );
                    if (m) parentHeaderId = `project-details-header:${m.id}`;
                } else if (id.startsWith('career-detail:')) {
                    const detailId = id.replace('career-detail:', '');
                    const p = orderedCareerCards
                        .flatMap((c) => c.projects)
                        .find((proj) => proj.details.some((d) => String(d.id) === detailId));
                    if (p) parentHeaderId = `career-details-header:${p.id}`;
                }
                if (parentHeaderId && store.forcedPageOverrides[parentHeaderId] !== undefined)
                    return null;
            }

            const labelText = `${itemTitle} 항목이 ${forcedPage + 1}페이지로 강제 배치되었습니다.`;

            return (
                <div className="absolute -top-7 left-[112px] right-0 z-30 flex items-center justify-between rounded-md border border-indigo-400/50 bg-slate-900/90 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-md print:hidden pointer-events-auto">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-black text-white shrink-0">
                            강제 위치 배치됨
                        </span>
                        <span className="text-[11px] text-indigo-100 font-semibold truncate max-w-[320px]">
                            {labelText}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            store.clearForcedPage(getAssociatedAtomIds(id));
                        }}
                        className="flex items-center gap-1 shrink-0 rounded bg-rose-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-rose-700 active:scale-95 transition shadow-sm cursor-pointer ml-2"
                    >
                        <ArrowDown className="h-3.5 w-3.5" />
                        <span>강제 배치 해제 (원래 위치로)</span>
                    </button>
                </div>
            );
        }

        if (!isBoundary && currentGap === 0) return null;
        const targetPrevPage = (currentPage ?? 1) - 1;

        return (
            <div
                className={`absolute -top-7 ${isBoundary ? 'left-[112px]' : 'left-0'} right-0 z-30 flex items-center justify-between rounded-md border border-blue-400/50 bg-slate-900/90 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-md print:hidden pointer-events-auto`}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-black text-white shrink-0">
                        페이지 분할 지점
                    </span>
                    <span className="text-[11px] text-slate-200 font-semibold truncate max-w-[320px]">
                        {isBoundary
                            ? `${itemTitle} 항목부터 다음 페이지로 분할되었습니다.`
                            : `${itemTitle} 여백 세밀 조절 중`}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {isBoundary && targetPrevPage >= 0 && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                store.forcePage(getAssociatedAtomIds(id), targetPrevPage);
                            }}
                            className="flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-indigo-500 active:scale-95 transition shadow-sm cursor-pointer"
                        >
                            <ArrowUp className="h-3.5 w-3.5" />
                            <span>
                                {itemTitle} {targetPrevPage + 1}페이지로 강제 올리기
                            </span>
                        </button>
                    )}
                    <div
                        onMouseDown={startGapDrag(id)}
                        title="마우스로 위아래 여백을 끌어서 조절 (다음 페이지 위치 세밀 조절)"
                        className="flex cursor-ns-resize items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-blue-500 active:scale-95 transition shadow-sm"
                    >
                        <MoveVertical className="h-3.5 w-3.5" />
                        <span>위치/여백 조절</span>
                    </div>
                </div>
            </div>
        );
    };

    const renderSectionControls = (id: string) => {
        if (store.hidePrintGuides) return null;
        return (
            <div className="pp-controls print:hidden">
                <PrintEyeButton
                    id={id}
                    excluded={store.printExcludedIds.includes(id)}
                    onToggle={store.toggleExcluded}
                />
                <div
                    onMouseDown={startGapDrag(id)}
                    title="위쪽 간격 조절 (아래로 끌면 넓어짐)"
                    className="grid h-7 w-7 cursor-ns-resize place-items-center rounded-full bg-slate-900/90 text-white shadow-lg transition hover:bg-slate-900"
                >
                    <MoveVertical className="h-3.5 w-3.5" />
                </div>
            </div>
        );
    };

    const renderItemControls = (id: string) => {
        const isForced = store.forcedPageOverrides[id] !== undefined;
        const forcedPage = store.forcedPageOverrides[id];
        const nextPageNum = (forcedPage ?? 0) + 2;

        return (
            <div className="pp-controls print:hidden flex items-center gap-1 bg-slate-900/90 p-1 rounded-full shadow-lg backdrop-blur-md z-40">
                <PrintEyeButton
                    id={id}
                    excluded={store.printExcludedIds.includes(id)}
                    onToggle={store.toggleExcluded}
                />
                {isForced && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            store.clearForcedPage(getAssociatedAtomIds(id));
                        }}
                        title={`원래 위치(${nextPageNum}페이지)로 다시 내리기`}
                        className="flex h-6 items-center gap-1 rounded-full bg-rose-600 px-2.5 text-[10px] font-black text-white hover:bg-rose-700 transition cursor-pointer shadow-sm"
                    >
                        <ArrowDown className="h-3 w-3" />
                        <span>{nextPageNum}p로 내리기</span>
                    </button>
                )}
                <div
                    onMouseDown={startGapDrag(id)}
                    title="마우스를 위아래로 끌어서 간격 세밀 조절"
                    className="grid h-6 w-6 cursor-ns-resize place-items-center rounded-full bg-slate-700/90 text-white transition hover:bg-blue-600 hover:scale-110"
                >
                    <MoveVertical className="h-3 w-3" />
                </div>
            </div>
        );
    };

    const renderSectionGap = (id: string) => {
        const h = Math.max(0, store.sectionGaps[id] ?? 0);
        if (h === 0 || store.printExcludedIds.includes(id)) return null;
        return (
            <div
                aria-hidden
                data-print-gap
                className="print-gap-spacer shrink-0 w-full"
                style={{ height: `${h}px` }}
            />
        );
    };

    const renderItemGap = (id: string, sectionId?: string) => {
        const h = Math.max(0, store.sectionGaps[id] ?? 0);
        return (
            <Fragment key={`gap:${id}`}>
                {sectionId && renderPageBreakControl(id, sectionId)}
                {h > 0 && (
                    <div
                        aria-hidden
                        data-print-gap
                        className="print-gap-spacer shrink-0 w-full"
                        style={{ height: `${h}px` }}
                    />
                )}
            </Fragment>
        );
    };

    const renderAtomContent = (atom: PrintAtomItem) => {
        switch (atom.type) {
            case 'intro-profile':
                if (!profile) return null;
                const origProfile = introData.profile;
                return (
                    <div
                        id="intro-profile"
                        data-print-el
                        className="resume-profile-card relative p-0 pb-3 border-b border-slate-200 shadow-none rounded-none bg-transparent"
                    >
                        {renderSectionGap('intro-profile')}
                        {renderSectionControls('intro-profile')}
                        <div className="relative z-10 space-y-4">
                            <div className="resume-profile-toprow flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-100 pb-3">
                                <div className="space-y-1 shrink-0 min-w-0 flex-1">
                                    <h2 className="resume-profile-role font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-950 whitespace-nowrap text-sm">
                                        {renderInlineText({
                                            value: profile.jobTitle,
                                            baseValue: origProfile?.jobTitle ?? '',
                                            textClassName:
                                                'font-black tracking-tight text-slate-900 text-sm',
                                            placeholder: '직무명을 입력하세요',
                                            onChange: (val) => setProfileOverride('jobTitle', val),
                                        })}
                                    </h2>
                                    <div className="flex items-baseline gap-2 whitespace-nowrap">
                                        <h1 className="resume-profile-name font-black text-slate-900 whitespace-nowrap text-lg sm:text-xl">
                                            {profile.name}
                                        </h1>
                                        <span className="resume-profile-name-en font-bold text-slate-400 font-mono whitespace-nowrap text-xs">
                                            {profile.nameEn}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="resume-print-contact flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-200 pb-2 text-slate-600 text-xs font-mono">
                                <span>{profile.email}</span>
                                <span>{profile.phone}</span>
                                <span>{profile.githubUrl.replace(/^https?:\/\//, '')}</span>
                                <span>unbrdn.me</span>
                            </div>
                            <div>
                                <div className="resume-body mt-1 max-w-4xl whitespace-pre-line break-words text-slate-600 text-xs leading-relaxed">
                                    {renderInlineText({
                                        value: profile.bio,
                                        baseValue: origProfile?.bio ?? '',
                                        multiline: true,
                                        textClassName: 'text-slate-600 text-xs leading-relaxed',
                                        placeholder: '자기소개 및 소개 문구를 입력하세요',
                                        onChange: (val) => setProfileOverride('bio', val),
                                    })}
                                </div>
                                {((inlineEditMode &&
                                    profile.coreStackSummary &&
                                    profile.coreStackSummary.trim() !== '') ||
                                    (contentOverrides.profile?.coreStackSummary !== undefined &&
                                        contentOverrides.profile.coreStackSummary.trim() !==
                                            '')) && (
                                    <div className="resume-meta mt-2 text-[10px] font-bold text-slate-500 flex items-center gap-1.5 flex-wrap">
                                        <span className="shrink-0">핵심 기술 ·</span>
                                        {renderInlineText({
                                            value: profile.coreStackSummary ?? '',
                                            baseValue: origProfile?.coreStackSummary ?? '',
                                            textClassName: 'text-[10px] font-bold text-slate-500',
                                            placeholder:
                                                '비워두거나 삭제 시 인쇄물에서 완전히 숨겨집니다',
                                            onChange: (val) =>
                                                setProfileOverride('coreStackSummary', val),
                                        })}
                                        {inlineEditMode && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setProfileOverride('coreStackSummary', '');
                                                }}
                                                className="ml-1 inline-flex items-center gap-0.5 rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs hover:bg-rose-600 transition print:hidden cursor-pointer"
                                                title="프로필 자기소개 밑 핵심기술 라인 완전히 삭제/숨기기"
                                            >
                                                ❌ 핵심기술 라인 삭제
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );

            case 'skills':
                return (
                    <div
                        data-print-el
                        className="flex flex-col font-black text-slate-900 w-full mt-6 pt-2 relative"
                    >
                        {renderSectionGap('skills')}
                        {renderSectionControls('skills')}
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2 w-full">
                            <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                                <Cpu className="h-4 w-4 text-slate-900" />
                                기술 스택
                            </h2>
                            {inlineEditMode && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSkillSelectorModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1 text-xs font-black text-white shadow-xs hover:bg-blue-700 transition cursor-pointer print:hidden"
                                    title="DB 전체 기술 스택 선택 및 관리 모달 열기"
                                >
                                    <Settings className="h-3.5 w-3.5" />
                                    <span>⚙ DB 기술스택 선택/관리</span>
                                </button>
                            )}
                        </div>
                    </div>
                );

            case 'skills-group': {
                const fullGroup = groupCoreSkills(introData.skills).find(
                    (g) => g.value === atom.dataId
                );
                const activeGroup = groupedCoreSkills.find((g) => g.value === atom.dataId);
                const displaySkills = inlineEditMode
                    ? (fullGroup?.skills ?? [])
                    : (activeGroup?.skills ?? []);

                if (displaySkills.length === 0) return null;
                const itemId = `skills-group:${atom.dataId}`;
                const groupLabel = fullGroup?.label ?? activeGroup?.label ?? '';

                return (
                    <Fragment key={atom.id}>
                        {renderItemGap(itemId, 'skills')}
                        <div
                            data-print-el
                            className="py-3.5 border-b border-slate-100 last:border-b-0 w-full relative"
                        >
                            {renderItemControls(itemId)}
                            <div className="resume-skill-group space-y-1.5">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-0.5">
                                    <h4 className="resume-skill-group-title resume-subtitle flex items-center gap-2 font-black text-slate-500 text-xs">
                                        <span
                                            className="resume-skill-group-bar h-3 w-1 shrink-0 rounded-full bg-slate-900"
                                            aria-hidden
                                        />
                                        {groupLabel}
                                    </h4>
                                    {inlineEditMode && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSkillSelectorModalOpen(true);
                                            }}
                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline print:hidden cursor-pointer"
                                        >
                                            <Plus className="h-3 w-3" />
                                            <span>DB 스택 선택/관리</span>
                                        </button>
                                    )}
                                </div>
                                <div className="resume-skill-badges flex flex-wrap gap-1.5 border-l-2 border-slate-100 pl-2 pt-0.5">
                                    {displaySkills.map((skill) => {
                                        const isSelected =
                                            !contentOverrides.selectedSkillIds ||
                                            contentOverrides.selectedSkillIds.includes(skill.id);

                                        if (!inlineEditMode) {
                                            return (
                                                <span
                                                    key={skill.id}
                                                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-black text-slate-800"
                                                >
                                                    {skill.name}
                                                    {skill.skillVersion && (
                                                        <span className="rounded bg-slate-100 px-1 py-0.2 text-[9px] font-bold text-slate-500">
                                                            v{skill.skillVersion}
                                                        </span>
                                                    )}
                                                </span>
                                            );
                                        }

                                        return (
                                            <button
                                                type="button"
                                                key={skill.id}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    toggleSkillSelection(skill.id);
                                                }}
                                                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-black transition cursor-pointer print:hidden ${
                                                    isSelected
                                                        ? 'border-blue-400 bg-blue-50/90 text-blue-950 shadow-xs ring-2 ring-blue-300/60 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-900'
                                                        : 'border-dashed border-slate-300 bg-slate-100/60 text-slate-400 line-through opacity-70 hover:border-blue-400 hover:text-blue-600 hover:opacity-100'
                                                }`}
                                                title={
                                                    isSelected
                                                        ? `'${skill.name}' 템플릿에서 삭제/제외하기 (클릭)`
                                                        : `'${skill.name}' 템플릿에 추가/포함하기 (클릭)`
                                                }
                                            >
                                                <span>{skill.name}</span>
                                                {skill.skillVersion && (
                                                    <span
                                                        className={`rounded px-1 py-0.2 text-[9px] font-bold ${
                                                            isSelected
                                                                ? 'bg-blue-200/80 text-blue-800'
                                                                : 'bg-slate-200 text-slate-400'
                                                        }`}
                                                    >
                                                        v{skill.skillVersion}
                                                    </span>
                                                )}
                                                <span
                                                    className={`ml-0.5 rounded-full px-1 text-[9px] font-black ${
                                                        isSelected
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-slate-300 text-slate-600'
                                                    }`}
                                                >
                                                    {isSelected ? '✓' : '＋'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                    {inlineEditMode && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSkillSelectorModalOpen(true);
                                            }}
                                            className="inline-flex items-center gap-1 rounded-md border border-dashed border-blue-400 bg-blue-50/60 px-2 py-0.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer print:hidden"
                                            title="DB 기술스택 추가 및 관리 모달 열기"
                                        >
                                            <Plus className="h-3 w-3" />
                                            <span>스택 선택/추가</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Fragment>
                );
            }

            case 'competency-header':
                return (
                    <div
                        data-print-el
                        className="resume-competency-header flex flex-col w-full mt-6 pt-2 relative"
                    >
                        {renderSectionGap('competencies')}
                        {renderSectionControls('competencies')}
                        <div className="flex items-center justify-start gap-2 border-b border-slate-200 pb-2 w-full">
                            <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                                <Sparkles className="h-4 w-4 text-slate-900" />
                                핵심 역량
                            </h2>
                        </div>
                    </div>
                );

            case 'competency-item': {
                const competency = orderedCompetencies.find((c) => c.id === atom.dataId);
                if (!competency) return null;
                const index = orderedCompetencies.indexOf(competency);
                const itemId = `competency:${competency.id}`;

                const origComp = introData.competencies.find((c) => c.id === competency.id);
                const origTitle = origComp?.title ?? competency.title;
                const origSummary = origComp?.summary ?? competency.summary;

                return (
                    <Fragment key={atom.id}>
                        {renderItemGap(itemId, 'competencies')}
                        <div data-print-el className="relative w-full">
                            {renderItemControls(itemId)}
                            <article className="print-competency-row grid gap-3 py-3.5 sm:grid-cols-[minmax(0,0.32fr)_minmax(0,0.68fr)] sm:gap-6 print:grid-cols-[minmax(0,0.31fr)_minmax(0,0.69fr)] print:gap-4 print:py-3.5 border-b border-slate-100 last:border-b-0 w-full">
                                <div className="min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className="resume-label inline-block w-7 shrink-0 font-black tabular-nums tracking-[0.14em] text-slate-400 text-xs">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <h3 className="resume-item-title font-black text-slate-900 text-xs min-w-0 flex-1">
                                            {renderInlineText({
                                                value: competency.title,
                                                baseValue: origTitle,
                                                textClassName: 'font-black text-slate-900 text-xs',
                                                placeholder: '핵심 역량 제목을 입력하세요',
                                                onChange: (val) =>
                                                    setCompetencyOverride(
                                                        competency.id,
                                                        'title',
                                                        val,
                                                        origTitle
                                                    ),
                                            })}
                                        </h3>
                                    </div>
                                    {competency.skills.length > 0 && (
                                        <p className="resume-meta mt-1 pl-9 font-bold text-slate-500 text-[10px]">
                                            {competency.skills
                                                .slice(0, 6)
                                                .map((skill) => skill.name)
                                                .join(' · ')}
                                        </p>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="resume-body font-semibold text-slate-700 text-xs leading-relaxed">
                                        {renderInlineText({
                                            value: competency.summary,
                                            baseValue: origSummary,
                                            multiline: true,
                                            textClassName:
                                                'font-semibold text-slate-700 text-xs leading-relaxed',
                                            placeholder: '핵심 역량 요약 및 설명을 입력하세요',
                                            onChange: (val) =>
                                                setCompetencyOverride(
                                                    competency.id,
                                                    'summary',
                                                    val,
                                                    origSummary
                                                ),
                                        })}
                                    </div>
                                </div>
                            </article>
                        </div>
                    </Fragment>
                );
            }

            case 'career-header':
                return (
                    <div
                        data-print-el
                        className="mb-2 flex flex-col font-black text-slate-900 w-full mt-6 pt-2 relative"
                    >
                        {renderSectionGap('career')}
                        {renderSectionControls('career')}
                        <div className="flex items-center justify-start gap-2 border-b border-slate-200 pb-2 w-full">
                            <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                                <Briefcase className="h-4 w-4 text-slate-900" />
                                직장 경력 (총 {careerSummary})
                            </h2>
                        </div>
                    </div>
                );

            case 'career-company': {
                const career = orderedCareerCards.find((c) => c.id === atom.dataId);
                if (!career) return null;
                const itemId = `career-company:${career.id}`;
                const origExp = introData.experiences.find((e) => e.id === career.id);
                const origCompanyName = origExp?.companyName ?? career.companyName;
                const origSummary = origExp?.summary ?? career.summary ?? '';

                return (
                    <Fragment key={atom.id}>
                        {renderItemGap(itemId, 'career')}
                        <div
                            data-print-el
                            className="border-b border-slate-100 py-3.5 w-full relative"
                        >
                            {renderItemControls(itemId)}
                            <span className="resume-print-plain resume-meta inline-flex rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-bold text-slate-950 text-xs">
                                {career.period}
                            </span>
                            <p className="resume-item-title mt-1.5 font-black text-slate-800 text-sm">
                                {renderInlineText({
                                    value: career.companyName,
                                    baseValue: origCompanyName,
                                    textClassName: 'font-black text-slate-800 text-sm',
                                    placeholder: '회사명을 입력하세요',
                                    onChange: (val) =>
                                        setExperienceOverride(
                                            career.id,
                                            'title',
                                            val,
                                            origCompanyName
                                        ),
                                })}{' '}
                                ({career.employmentType})
                            </p>
                            <p className="resume-meta font-semibold text-slate-500 text-xs">
                                {career.department} / {career.role}
                            </p>
                            {(career.summary || inlineEditMode) && (
                                <div className="resume-body mt-2 text-xs text-slate-600">
                                    {renderInlineText({
                                        value: career.summary ?? '',
                                        baseValue: origSummary,
                                        multiline: true,
                                        textClassName: 'text-xs text-slate-600',
                                        placeholder: '회사 및 담당업무 개요를 입력하세요',
                                        onChange: (val) =>
                                            setExperienceOverride(
                                                career.id,
                                                'summary',
                                                val,
                                                origSummary
                                            ),
                                    })}
                                </div>
                            )}
                        </div>
                    </Fragment>
                );
            }

            case 'career-item': {
                const career = orderedCareerCards.find((c) =>
                    c.projects.some((p) => p.id === atom.dataId)
                );
                const project = career?.projects.find((p) => p.id === atom.dataId);
                if (!project || !career) return null;
                const itemId = `career-project:${project.id}`;
                const hasDetails = project.details && project.details.length > 0;

                const origExp = introData.experiences
                    .flatMap((e) => (e.details ? [e] : []))
                    .find((e) => e.id === project.id);
                const origTitle = origExp?.title ?? project.title;
                const origSummary = origExp?.summary ?? project.summary ?? '';

                return (
                    <Fragment key={atom.id}>
                        {renderItemGap(itemId, 'career')}
                        <div
                            data-print-el
                            className={`w-full relative ${hasDetails ? 'pt-3.5 pb-2' : 'py-3.5 border-b border-slate-100 last:border-b-0'}`}
                        >
                            {renderItemControls(itemId)}
                            <div className="flex w-full items-start gap-2.5 text-left">
                                <span className="min-w-0 flex-1">
                                    <span className="resume-body block font-bold text-slate-900 text-xs">
                                        {renderInlineText({
                                            value: project.title,
                                            baseValue: origTitle,
                                            textClassName: 'font-bold text-slate-900 text-xs',
                                            placeholder: '프로젝트 제목을 입력하세요',
                                            onChange: (val) =>
                                                setExperienceOverride(
                                                    project.id,
                                                    'title',
                                                    val,
                                                    origTitle
                                                ),
                                        })}
                                    </span>
                                    <span className="resume-meta mt-0.5 block text-slate-400 text-[10px]">
                                        {project.periodStart.replace(/-/g, '.').substring(0, 7)} -{' '}
                                        {project.periodEnd
                                            ? project.periodEnd.replace(/-/g, '.').substring(0, 7)
                                            : '진행 중'}
                                        {project.contributionRate != null
                                            ? ` · 기여도 ${project.contributionRate}%`
                                            : ''}
                                    </span>
                                </span>
                            </div>
                            {(project.summary || inlineEditMode) && (
                                <div className="mt-1.5">
                                    <h4 className="resume-label font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                                        프로젝트 설명 및 역할
                                    </h4>
                                    <div className="resume-body mt-0.5 text-xs text-slate-600">
                                        {renderInlineText({
                                            value: project.summary ?? '',
                                            baseValue: origSummary,
                                            multiline: true,
                                            textClassName: 'text-xs text-slate-600',
                                            placeholder: '프로젝트 설명 및 역할을 입력하세요',
                                            onChange: (val) =>
                                                setExperienceOverride(
                                                    project.id,
                                                    'summary',
                                                    val,
                                                    origSummary
                                                ),
                                        })}
                                    </div>
                                </div>
                            )}
                            {project.skills && project.skills.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {project.skills.map((s) => (
                                        <span
                                            key={s.id}
                                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 border border-slate-200/60"
                                        >
                                            {s.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Fragment>
                );
            }

            case 'career-detail-item': {
                const allProjects = orderedCareerCards.flatMap((c) => c.projects);
                const p = allProjects.find((proj) =>
                    proj.details?.some((d) => d.id === atom.dataId)
                );
                const detail = p?.details?.find((d) => d.id === atom.dataId);
                if (!detail || !p) return null;
                const itemId = `career-detail:${detail.id}`;
                const isFirst = p.details[0]?.id === detail.id;

                const origDetail = introData.experiences
                    .flatMap((e) => e.details)
                    .find((d) => d?.id === detail.id);
                const origContent = origDetail?.content ?? detail.content;
                const origNarrative =
                    origDetail?.narrative ||
                    [origDetail?.situation, origDetail?.actionDetail, origDetail?.outcome]
                        .filter(Boolean)
                        .join('\n\n') ||
                    '';

                return (
                    <Fragment key={atom.id}>
                        {renderItemGap(itemId, 'career')}
                        <div
                            data-print-el
                            className="py-2 pl-3 border-l-2 border-slate-200 border-b border-slate-100/60 last:border-b-0 w-full relative"
                        >
                            {renderItemControls(itemId)}
                            {isFirst && (
                                <div className="resume-detail-header flex items-center gap-1.5 pb-1.5 border-b border-slate-100 mb-2">
                                    <h4 className="resume-label flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700 text-[10px]">
                                        <Briefcase className="h-3 w-3 text-slate-500" />
                                        상세 경험
                                    </h4>
                                </div>
                            )}
                            <div className="flex items-start gap-1 font-bold text-slate-900 text-xs">
                                <span className="shrink-0">•</span>
                                {renderInlineText({
                                    value: detail.content,
                                    baseValue: origContent,
                                    textClassName: 'font-bold text-slate-900 text-xs',
                                    placeholder: '상세 성과 제목을 입력하세요',
                                    onChange: (val) =>
                                        setDetailOverride(detail.id, 'content', val, origContent),
                                })}
                            </div>
                            {renderDetailFields(
                                detail,
                                inlineEditMode,
                                origNarrative,
                                (val) =>
                                    setDetailOverride(detail.id, 'narrative', val, origNarrative),
                                renderInlineText
                            )}
                        </div>
                    </Fragment>
                );
            }

            case 'credentials-header':
                return (
                    <div
                        data-print-el
                        className="flex flex-col font-black text-slate-900 w-full mt-6 pt-2 relative"
                    >
                        {renderSectionGap('credentials')}
                        {renderSectionControls('credentials')}
                        <div className="flex items-center justify-start gap-2 border-b border-slate-200 pb-2 w-full">
                            <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                                <GraduationCap className="h-4 w-4 text-slate-900" />
                                학력·교육 및 자격증
                            </h2>
                        </div>
                    </div>
                );

            case 'credential-item': {
                const cred = orderedCredentialExperiences.find((c) => c.id === atom.dataId);
                if (!cred) return null;
                const itemId = `credential:${cred.id}`;
                const kind = credentialKindLabel(cred);

                return (
                    <Fragment key={atom.id}>
                        {renderItemGap(itemId, 'credentials')}
                        <article
                            data-print-el
                            className="py-2.5 border-b border-slate-100 last:border-b-0 w-full relative flex flex-col"
                        >
                            {renderItemControls(itemId)}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="resume-label rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 shrink-0">
                                        {kind}
                                    </span>
                                    <h3 className="font-bold text-slate-900 text-xs truncate">
                                        {cred.title}
                                    </h3>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                    {formatCredentialPeriod(cred)}
                                </span>
                            </div>
                            {kind === '교육' && cred.summary && (
                                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                    {cred.summary}
                                </p>
                            )}
                        </article>
                    </Fragment>
                );
            }

            case 'projects-header':
                return (
                    <div
                        data-print-el
                        className="flex flex-col font-black text-slate-900 w-full mt-6 pt-2 relative"
                    >
                        {renderSectionGap('projects')}
                        {renderSectionControls('projects')}
                        <div className="flex items-center justify-start gap-2 border-b border-slate-200 pb-2 w-full">
                            <h2 className="resume-section-title flex items-center gap-2 font-black text-slate-900">
                                <FolderGit2 className="h-4 w-4 text-slate-900" />
                                핵심 프로젝트 포트폴리오
                            </h2>
                        </div>
                    </div>
                );

            case 'project-item': {
                const m = orderedMilestones.find((item) => item.id === atom.dataId);
                if (!m) return null;
                const itemId = `project:${m.id}`;
                const hasDetails = m.details && m.details.length > 0;

                return (
                    <Fragment key={atom.id}>
                        {renderItemGap(itemId, 'projects')}
                        <article
                            data-print-el
                            className={`w-full relative flex flex-col ${hasDetails ? 'pt-3.5 pb-2' : 'py-3.5 border-b border-slate-100 last:border-b-0'}`}
                        >
                            {renderItemControls(itemId)}
                            <div className="flex items-baseline justify-between gap-2">
                                <h3 className="font-black text-slate-900 text-xs">{m.title}</h3>
                                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                    {m.period}
                                </span>
                            </div>
                            {m.role && (
                                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                    {m.role}
                                </p>
                            )}
                            {m.description && (
                                <p className="mt-1 text-xs text-slate-600">{m.description}</p>
                            )}
                            {m.skills && m.skills.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {m.skills.map((s) => (
                                        <span
                                            key={s}
                                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 border border-slate-200/60"
                                        >
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </article>
                    </Fragment>
                );
            }

            case 'project-detail-item': {
                const m = orderedMilestones.find((item) =>
                    item.details?.some((d) => d.id === atom.dataId)
                );
                const detail = m?.details?.find((d) => d.id === atom.dataId);
                if (!detail || !m) return null;
                const itemId = `project-detail:${detail.id}`;
                const isFirst = m.details[0]?.id === detail.id;

                const origDetail = introData.experiences
                    .flatMap((e) => e.details)
                    .find((d) => d?.id === detail.id);
                const origContent = origDetail?.content ?? detail.content;
                const origNarrative =
                    origDetail?.narrative ||
                    [origDetail?.situation, origDetail?.actionDetail, origDetail?.outcome]
                        .filter(Boolean)
                        .join('\n\n') ||
                    '';

                return (
                    <Fragment key={atom.id}>
                        {renderItemGap(itemId, 'projects')}
                        <div
                            data-print-el
                            className="py-2 pl-3 border-l-2 border-slate-200 border-b border-slate-100/60 last:border-b-0 w-full relative"
                        >
                            {renderItemControls(itemId)}
                            {isFirst && (
                                <div className="resume-detail-header flex items-center gap-1.5 pb-1.5 border-b border-slate-100 mb-2">
                                    <h4 className="resume-label flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700 text-[10px]">
                                        <Briefcase className="h-3 w-3 text-slate-500" />
                                        상세 경험
                                    </h4>
                                </div>
                            )}
                            <div className="flex items-start gap-1 font-bold text-slate-900 text-xs">
                                <span className="shrink-0">•</span>
                                {renderInlineText({
                                    value: detail.content,
                                    baseValue: origContent,
                                    textClassName: 'font-bold text-slate-900 text-xs',
                                    placeholder: '상세 성과 제목을 입력하세요',
                                    onChange: (val) =>
                                        setDetailOverride(detail.id, 'content', val, origContent),
                                })}
                            </div>
                            {renderDetailFields(
                                detail,
                                inlineEditMode,
                                origNarrative,
                                (val) =>
                                    setDetailOverride(detail.id, 'narrative', val, origNarrative),
                                renderInlineText
                            )}
                        </div>
                    </Fragment>
                );
            }

            default:
                return null;
        }
    };

    const handlePrintConfirm = () => {
        printLayoutFrozenRef.current = false;
        store.setPrintPending(true);
    };

    useEffect(() => {
        if (!store.printPending) return;
        let cancelled = false;
        const nextFrame = () =>
            new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const waitAtMost = async (promise: Promise<unknown>, timeoutMs = 5000) => {
            let timer = 0;
            await Promise.race([
                promise.catch(() => undefined),
                new Promise<void>((resolve) => {
                    timer = window.setTimeout(resolve, timeoutMs);
                }),
            ]);
            window.clearTimeout(timer);
        };
        const printWhenLayoutIsStable = async () => {
            await waitAtMost(document.fonts.ready);
            if (cancelled) return;
            await Promise.all(
                Array.from(document.querySelectorAll<HTMLImageElement>('.pdf-page-layer img')).map(
                    async (image) => {
                        if (!image.complete) {
                            await new Promise<void>((resolve) => {
                                let timer = 0;
                                const finish = () => {
                                    window.clearTimeout(timer);
                                    image.removeEventListener('load', finish);
                                    image.removeEventListener('error', finish);
                                    resolve();
                                };
                                image.addEventListener('load', finish);
                                image.addEventListener('error', finish);
                                timer = window.setTimeout(finish, 5000);
                                if (image.complete) finish();
                            });
                        }
                        await waitAtMost(image.decode());
                    }
                )
            );
            await nextFrame();
            await nextFrame();
            if (cancelled) return;

            printLayoutFrozenRef.current = true;
            try {
                window.print();
            } catch {
                printLayoutFrozenRef.current = false;
            } finally {
                if (!cancelled) store.setPrintPending(false);
            }
        };
        void printWhenLayoutIsStable();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.printPending]);

    const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);

    return (
        <>
            <div className="h-screen overflow-hidden flex flex-col bg-slate-900 print:h-auto print:overflow-visible print:bg-white">
                <PrintPreviewBar
                    excludedCount={store.printExcludedIds.length}
                    totalPages={pageLayers.length}
                    navOpen={store.navPanelOpen}
                    activeTemplateName={activeTemplateName}
                    onToggleAll={store.toggleAllExcluded}
                    onToggleNav={() => store.setNavPanelOpen(!store.navPanelOpen)}
                    onSaveLocal={() => {
                        const defaultName = generateUniqueLocalName('내 맞춤 인쇄 설정');
                        const memo = window.prompt(
                            '현재 인쇄 설정에 대한 설명/메모를 입력하세요:',
                            defaultName
                        );
                        if (memo === null) return;
                        const trimmed = memo.trim() || defaultName;
                        const existingSaves = getLocalSaves();
                        if (existingSaves.some((s) => s.memo.trim() === trimmed)) {
                            const confirmed = window.confirm(
                                `'${trimmed}' 이름의 인쇄 설정이 이미 존재합니다.\n\n기존 설정을 덮어쓰시겠습니까?`
                            );
                            if (!confirmed) return;
                        }
                        saveLocal({
                            memo: trimmed,
                            excludedIds: store.printExcludedIds,
                            sectionOrder: store.printSectionOrder,
                            sectionGaps: store.sectionGaps,
                            forcedPageOverrides: store.forcedPageOverrides,
                        });
                        alert(`'${trimmed}' 인쇄 설정이 성공적으로 저장되었습니다.`);
                    }}
                    onSaveServer={adminMode ? () => setSaveTemplateModalOpen(true) : undefined}
                    onOpenTemplateModal={() => setModeModalOpen(true)}
                    onPrint={handlePrintConfirm}
                    onCancel={onExit}
                    zoom={store.zoom}
                    onZoomChange={store.setZoom}
                    onZoomFit={handleZoomFit}
                    hideGuides={store.hidePrintGuides}
                    onToggleHideGuides={store.toggleHidePrintGuides}
                    inlineEditMode={inlineEditMode}
                    onToggleInlineEditMode={() => setInlineEditMode(!inlineEditMode)}
                />

                {inlineEditMode && (
                    <div className="bg-slate-950 border-b border-blue-500/40 px-4 py-2 text-xs font-bold text-blue-200 flex items-center justify-center gap-2 shadow-md print:hidden shrink-0 z-40">
                        <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
                        <span>
                            ✍️ 인라인 문구 편집 모드 활성화: A4 종이 위의 파란색 테두리 텍스트를
                            클릭하여 맞춤 문구를 직접 수정하세요. 상단 &apos;템플릿으로 저장&apos;
                            클릭 시 함께 저장됩니다.
                        </span>
                    </div>
                )}

                <div className="flex-1 min-h-0 flex">
                    <div
                        ref={canvasRef}
                        className="pdf-canvas flex-1 min-h-0 overflow-y-auto bg-[#cbd5e1] flex flex-col items-center pt-10 pb-4 relative print:block print:h-auto print:w-full print:bg-transparent print:p-0 print:m-0"
                    >
                        <div
                            className="resume-page resume-print-shell transition-all duration-300 flex flex-col items-center gap-10 print:gap-0 print:w-full print:max-w-none print:m-0 print:p-0 print:bg-transparent"
                            style={{ zoom: store.zoom }}
                        >
                            {pageLayers.map((page, pageIdx) => (
                                <PdfPageLayer
                                    key={pageIdx}
                                    pageIndex={pageIdx}
                                    totalPages={pageLayers.length}
                                    hideGuides={store.hidePrintGuides}
                                >
                                    {page.items.map((atom) => (
                                        <div
                                            key={atom.id}
                                            data-atom-id={atom.id}
                                            className="w-full"
                                        >
                                            {renderAtomContent(atom)}
                                        </div>
                                    ))}
                                </PdfPageLayer>
                            ))}
                        </div>
                    </div>

                    <div
                        className="print:hidden shrink-0 transition-all duration-300"
                        style={{ width: store.navPanelOpen ? 256 : 56 }}
                    >
                        <PrintPreviewNav
                            sections={orderedPrintableSections}
                            excludedIds={store.printExcludedIds}
                            itemGroups={[
                                {
                                    sectionId: 'competencies',
                                    items: orderedCompetencies.map((c) => ({
                                        id: `competency:${c.id}`,
                                        label: c.title,
                                    })),
                                },
                                {
                                    sectionId: 'career',
                                    items: orderedCareerCards.flatMap((career) =>
                                        career.projects.map((p) => ({
                                            id: `career-project:${p.id}`,
                                            label: p.title,
                                        }))
                                    ),
                                },
                                {
                                    sectionId: 'credentials',
                                    items: orderedCredentialExperiences.map((c) => ({
                                        id: `credential:${c.id}`,
                                        label: c.title,
                                    })),
                                },
                                {
                                    sectionId: 'projects',
                                    items: orderedMilestones.map((m) => ({
                                        id: `project:${m.id}`,
                                        label: m.title,
                                    })),
                                },
                            ]}
                            lockedSectionIds={[LOCKED_PRINT_SECTION_ID]}
                            open={store.navPanelOpen}
                            onRequestToggle={() => store.setNavPanelOpen(!store.navPanelOpen)}
                            onToggle={store.toggleExcluded}
                            onReorder={store.reorderSections}
                            onNavigate={(id) => {
                                const el =
                                    document.getElementById(id) ??
                                    document.querySelector<HTMLElement>(
                                        `[data-print-id="${CSS.escape(id)}"]`
                                    );
                                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            onToggleAll={store.toggleAllExcluded}
                            excludedCount={store.printExcludedIds.length}
                        />
                    </div>
                </div>
            </div>

            <PrintModeModal
                open={modeModalOpen}
                onClose={() => setModeModalOpen(false)}
                onManual={() => {
                    store.resetManual();
                    setActiveTemplate(null);
                    setActiveTemplateName('기본 이력서');
                    setContentOverrides({});
                    setModeModalOpen(false);
                    updateUrlParams(null);
                }}
                onApplyTemplate={(settings) => {
                    store.applyTemplate(settings);
                    const tmpl = settings.selectedTemplate ?? null;
                    setActiveTemplate(tmpl);
                    setActiveTemplateName(tmpl ? tmpl.name : '맞춤 인쇄 템플릿');
                    setContentOverrides(settings.contentOverrides ?? {});
                    setModeModalOpen(false);
                    updateUrlParams(tmpl?.id ?? null);
                }}
            />

            <SaveServerTemplateModal
                key={`${activeTemplate?.id ?? 'new'}-${saveTemplateModalOpen ? 'open' : 'closed'}`}
                open={saveTemplateModalOpen}
                onClose={() => setSaveTemplateModalOpen(false)}
                currentSettings={{
                    excludedIds: store.printExcludedIds,
                    sectionOrder: store.printSectionOrder,
                    sectionGaps: store.sectionGaps,
                    forcedPageOverrides: store.forcedPageOverrides,
                    targetRole: activeTemplate?.targetRole ?? 'GENERAL',
                    contentOverrides,
                    baseContentFingerprint: getPrintContentFingerprint(introData),
                }}
                editingTemplate={activeTemplate}
            />

            {skillSelectorModalOpen && (
                <PrintSkillSelectorModal
                    allSkills={introData.skills}
                    selectedSkillIds={contentOverrides.selectedSkillIds}
                    onToggleSkill={toggleSkillSelection}
                    onSelectAllInGroup={selectAllSkillsInGroup}
                    onDeselectAllInGroup={deselectAllSkillsInGroup}
                    onResetToAll={resetSkillsToAll}
                    onClose={() => setSkillSelectorModalOpen(false)}
                />
            )}
        </>
    );
}
