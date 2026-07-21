/**
 * PDF Page Layer & Layout Engine
 *
 * 1:1 match between Figma-style Canvas preview pages and PDF print pages.
 */

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const PAD_TOP_MM = 12;
export const PAD_BOTTOM_MM = 12;
export const PAD_LEFT_MM = 14;
export const PAD_RIGHT_MM = 14;
export const CONTENT_HEIGHT_MM = 273; // 297 - 24

// 96 DPI standard scale for pixel measurements (1mm = 3.779527559px)
export const MM_TO_PX = 3.779527559;
export const A4_WIDTH_PX = Math.round(A4_WIDTH_MM * MM_TO_PX); // ~794px
export const A4_HEIGHT_PX = Math.round(A4_HEIGHT_MM * MM_TO_PX); // ~1123px
export const CONTENT_HEIGHT_PX = Math.round(CONTENT_HEIGHT_MM * MM_TO_PX); // ~1032px
export const PAD_TOP_PX = Math.round(PAD_TOP_MM * MM_TO_PX); // ~45px
export const PAD_BOTTOM_PX = Math.round(PAD_BOTTOM_MM * MM_TO_PX); // ~45px

export type AtomType =
    | 'intro-profile'
    | 'skills'
    | 'skills-group'
    | 'competency-header'
    | 'competency-item'
    | 'career-header'
    | 'career-company'
    | 'career-item'
    | 'career-details-header'
    | 'career-detail-item'
    | 'credentials-header'
    | 'credential-item'
    | 'projects-header'
    | 'project-item'
    | 'project-details-header'
    | 'project-detail-item'
    | 'project-skills';

export interface PrintAtomItem {
    id: string; // e.g. 'intro-profile', 'skills', 'competency-header', 'competency:1', 'career-project:10'
    type: AtomType;
    sectionId: string; // 'intro-profile' | 'skills' | 'competencies' | 'career' | 'credentials' | 'projects'
    title?: string;
    dataId?: string | number;
    isHeader?: boolean;
}

export interface PageLayerData {
    pageIndex: number;
    items: PrintAtomItem[];
    heightUsedPx: number;
}

function getAtomEstimatedHeight(atom: PrintAtomItem): number {
    switch (atom.type) {
        case 'intro-profile':
            return 450;
        case 'skills':
            return 45;
        case 'skills-group':
            return 220;
        case 'competency-header':
            return 45;
        case 'competency-item':
            return 110;
        case 'career-header':
            return 45;
        case 'career-company':
            return 120;
        case 'career-item':
            return 70;
        case 'career-details-header':
            return 25;
        case 'career-detail-item':
            return 75;
        case 'credentials-header':
            return 45;
        case 'credential-item':
            return 85;
        case 'projects-header':
            return 45;
        case 'project-item':
            return 60;
        case 'project-details-header':
            return 25;
        case 'project-detail-item':
            return 75;
        case 'project-skills':
            return 35;
        default:
            return 120;
    }
}

/**
 * Packs ordered printable atom items into discrete page layers.
 * Uses item heights measured from DOM or fallback heights.
 * Ensures headers are not orphaned at page bottoms.
 */
export function partitionAtomsIntoPages(
    atoms: PrintAtomItem[],
    itemHeights: Map<string, number>,
    sectionGaps: Record<string, number> = {},
    forcedPageOverrides: Record<string, number> = {}
): PageLayerData[] {
    if (atoms.length === 0) {
        return [{ pageIndex: 0, items: [], heightUsedPx: 0 }];
    }

    const pages: PageLayerData[] = [];
    let currentPageItems: PrintAtomItem[] = [];
    let currentHeight = 0;
    // 20px 안전 여유 버퍼를 확보하여(1012px), 인쇄 시 벡터 폰트 커닝 오차(+10~15px)가 발생해도 글자가 짤리지 않도록 100% 일치시킴
    const maxContentHeight = CONTENT_HEIGHT_PX - 20;

    const startNewPage = () => {
        if (currentPageItems.length > 0) {
            pages.push({
                pageIndex: pages.length,
                items: currentPageItems,
                heightUsedPx: currentHeight,
            });
            currentPageItems = [];
            currentHeight = 0;
        }
    };

    for (let i = 0; i < atoms.length; i++) {
        const atom = atoms[i];
        const measuredHeight = itemHeights.get(atom.id) || getAtomEstimatedHeight(atom);
        const customGap =
            sectionGaps[atom.id] ?? (atom.isHeader ? sectionGaps[atom.sectionId] : undefined) ?? 0;
        const defaultGap = currentPageItems.length > 0 ? 8 : 0;
        const gap = customGap !== 0 ? customGap : defaultGap;

        const itemTotalHeight = measuredHeight + gap;

        // Check if user explicitly forced this item to stay on the current page
        const forcedPage = forcedPageOverrides[atom.id];
        const isForcedCurrentPage = forcedPage !== undefined && forcedPage === pages.length;

        // If an item is a header (e.g., 'career-header'), check if the NEXT item fits on this page too.
        // If header fits but next item doesn't, push header to next page so it's not orphaned.
        let pushHeaderToNextPage = false;
        if (!isForcedCurrentPage && atom.isHeader && i + 1 < atoms.length) {
            const nextAtom = atoms[i + 1];
            const nextHeight = itemHeights.get(nextAtom.id) || getAtomEstimatedHeight(nextAtom);
            const nextCustomGap =
                sectionGaps[nextAtom.id] ??
                (nextAtom.isHeader ? sectionGaps[nextAtom.sectionId] : undefined) ??
                0;
            const nextGap = nextCustomGap !== 0 ? nextCustomGap : 6;

            if (
                currentHeight + itemTotalHeight + nextHeight + nextGap > maxContentHeight &&
                currentPageItems.length > 0
            ) {
                pushHeaderToNextPage = true;
            }
        }

        if (
            !isForcedCurrentPage &&
            ((currentHeight + itemTotalHeight > maxContentHeight && currentPageItems.length > 0) ||
                pushHeaderToNextPage)
        ) {
            startNewPage();
        }

        currentPageItems.push(atom);
        currentHeight += itemTotalHeight;
    }

    if (currentPageItems.length > 0) {
        pages.push({
            pageIndex: pages.length,
            items: currentPageItems,
            heightUsedPx: currentHeight,
        });
    }

    return pages.length > 0 ? pages : [{ pageIndex: 0, items: [], heightUsedPx: 0 }];
}
