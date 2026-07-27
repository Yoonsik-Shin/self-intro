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
    // 자동 분할에는 20px 안전 여유를 두되, 사용자의 강제 배치가 실제 콘텐츠
    // 영역을 넘기는 것은 허용하지 않는다. 강제 배치는 안전 여유만 사용할 수 있다.
    const maxContentHeight = CONTENT_HEIGHT_PX - 20;
    const hardContentHeight = CONTENT_HEIGHT_PX;

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

        const forcedPage = forcedPageOverrides[atom.id];

        // 순차 패킹이 이미 다음 페이지로 넘어간 뒤에도 사용자가 지정한 이전 페이지에
        // 실제 여유 공간이 남아 있으면 해당 atom을 그 페이지 끝에 직접 배치한다.
        // 기존 로직은 완료된 페이지로 되돌아가지 못해 강제 배치 상태만 표시되고
        // 항목은 원래 페이지에 남는 문제가 있었다.
        if (forcedPage !== undefined && forcedPage >= 0 && forcedPage < pages.length) {
            const targetPage = pages[forcedPage];
            const targetGap = customGap !== 0 ? customGap : targetPage.items.length > 0 ? 8 : 0;
            const targetItemTotalHeight = measuredHeight + targetGap;

            if (targetPage.heightUsedPx + targetItemTotalHeight <= hardContentHeight) {
                targetPage.items.push(atom);
                targetPage.heightUsedPx += targetItemTotalHeight;
                continue;
            }
        }

        // Check if user explicitly forced this item or any later item to stay on the current page
        const isForcedCurrentPage = forcedPage !== undefined && forcedPage === pages.length;
        const hasLaterItemForcedToCurrentPage = atoms
            .slice(i + 1)
            .some((laterAtom) => forcedPageOverrides[laterAtom.id] === pages.length);

        const preventPageBreak = isForcedCurrentPage || hasLaterItemForcedToCurrentPage;

        // If an item is a header (e.g., 'career-header'), check if the NEXT item fits on this page too.
        // If header fits but next item doesn't, push header to next page so it's not orphaned.
        let pushHeaderToNextPage = false;
        if (!preventPageBreak && atom.isHeader && i + 1 < atoms.length) {
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

        const exceedsAutomaticBoundary =
            currentHeight + itemTotalHeight > maxContentHeight && currentPageItems.length > 0;
        const exceedsPhysicalBoundary =
            currentHeight + itemTotalHeight > hardContentHeight && currentPageItems.length > 0;

        // forcedPageOverrides는 자동 분할의 안전 여유(20px)만 재사용할 수 있다.
        // 실제 A4 콘텐츠 영역까지 넘기면 화면에서는 다음 페이지 카드 밖으로
        // 콘텐츠가 새고, 인쇄에서는 잘리므로 강제 배치보다 물리 경계를 우선한다.
        if (
            exceedsPhysicalBoundary ||
            (!preventPageBreak && (exceedsAutomaticBoundary || pushHeaderToNextPage))
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
