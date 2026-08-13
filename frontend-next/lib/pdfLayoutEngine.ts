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

export type PageOrientation = 'portrait' | 'landscape';

export interface PageMetrics {
    orientation: PageOrientation;
    widthMm: number;
    heightMm: number;
    contentHeightMm: number;
    widthPx: number;
    heightPx: number;
    contentHeightPx: number;
}

/** A4 세로/가로 페이지 치수를 계산한다. 상하좌우 여백(mm)은 방향과 무관하게 동일하게 유지한다. */
export function getPageMetrics(orientation: PageOrientation = 'portrait'): PageMetrics {
    const widthMm = orientation === 'portrait' ? A4_WIDTH_MM : A4_HEIGHT_MM;
    const heightMm = orientation === 'portrait' ? A4_HEIGHT_MM : A4_WIDTH_MM;
    const contentHeightMm = heightMm - PAD_TOP_MM - PAD_BOTTOM_MM;
    return {
        orientation,
        widthMm,
        heightMm,
        contentHeightMm,
        widthPx: Math.round(widthMm * MM_TO_PX),
        heightPx: Math.round(heightMm * MM_TO_PX),
        contentHeightPx: Math.round(contentHeightMm * MM_TO_PX),
    };
}

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
    | 'project-skills'
    | 'cover-letter-header'
    | 'cover-letter-item'
    | 'custom-section-header'
    | 'custom-section-item'
    | 'portfolio-header'
    | 'portfolio-problem'
    | 'portfolio-thought'
    | 'portfolio-tradeoffs-header'
    | 'portfolio-tradeoff-item'
    | 'portfolio-solution'
    | 'portfolio-outcome-header'
    | 'portfolio-outcome-summary'
    | 'portfolio-outcome-metric'
    | 'portfolio-architecture-header'
    | 'portfolio-architecture-diagram'
    | 'portfolio-architecture-image';

export interface PrintAtomItem {
    id: string; // e.g. 'intro-profile', 'skills', 'competency-header', 'competency:1', 'career-project:10'
    type: AtomType;
    sectionId: string; // 'intro-profile' | 'skills' | 'competencies' | 'career' | 'credentials' | 'projects'
    title?: string;
    dataId?: string | number;
    isHeader?: boolean;
}

export interface PageLayerData {
    /** 저장된 OutputPage가 있으면 그 안정적인 ID, 아직 저장 전 자동 페이지면 auto-page-N. */
    pageId: string;
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
        case 'cover-letter-header':
            return 45;
        case 'cover-letter-item':
            return 160;
        case 'custom-section-header':
            return 45;
        case 'custom-section-item':
            return 120;
        case 'portfolio-header':
            return 160;
        case 'portfolio-problem':
        case 'portfolio-thought':
        case 'portfolio-solution':
            return 180;
        case 'portfolio-tradeoffs-header':
        case 'portfolio-outcome-header':
        case 'portfolio-architecture-header':
            return 45;
        case 'portfolio-tradeoff-item':
            return 140;
        case 'portfolio-outcome-summary':
            return 90;
        case 'portfolio-outcome-metric':
            return 40;
        case 'portfolio-architecture-diagram':
            return 320;
        case 'portfolio-architecture-image':
            return 260;
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
    forcedPageOverrides: Record<string, number> = {},
    contentHeightPx: number = CONTENT_HEIGHT_PX,
    stablePageIds: string[] = []
): PageLayerData[] {
    const pageIdAt = (pageIndex: number) =>
        stablePageIds[pageIndex] ?? `auto-page-${pageIndex + 1}`;
    if (atoms.length === 0) {
        return [{ pageId: pageIdAt(0), pageIndex: 0, items: [], heightUsedPx: 0 }];
    }

    const pages: PageLayerData[] = [];
    let currentPageItems: PrintAtomItem[] = [];
    let currentHeight = 0;
    // 자동 분할에는 20px 안전 여유를 둔다. 수동 강제 배치는 사용자가 빈 공간을
    // 직접 활용하기 위해 자동 판단을 명시적으로 덮어쓰는 기능이므로 별도로 우선한다.
    const maxContentHeight = contentHeightPx - 20;

    const startNewPage = () => {
        if (currentPageItems.length > 0) {
            pages.push({
                pageId: pageIdAt(pages.length),
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
        // 0px도 유효한 실측값이다. 조건부 렌더링으로 내용이 없는 atom을 `||`로
        // fallback 처리하면 화면에는 없는데 계산상으로만 수십~수백 px를 차지한다.
        const measuredHeight = itemHeights.get(atom.id) ?? getAtomEstimatedHeight(atom);
        const customGap =
            sectionGaps[atom.id] ?? (atom.isHeader ? sectionGaps[atom.sectionId] : undefined) ?? 0;
        // 각 atom 컴포넌트가 자신의 padding/margin을 실제 DOM 높이에 이미 포함한다.
        // 여기서 항목마다 별도 기본 간격까지 더하면 화면에는 없는 높이가 누적되어,
        // 항목 수가 많은 이력서에서 다음 섹션이 통째로 넘어가고 페이지 하단이 크게 빈다.
        // 레이아웃 엔진은 측정 높이와 사용자가 명시한 간격만 합산한다.
        const gap = customGap;

        const itemTotalHeight = measuredHeight + gap;

        const forcedPage = forcedPageOverrides[atom.id];

        // 순차 패킹이 이미 다음 페이지로 넘어간 뒤에도 사용자가 지정한 페이지에
        // 직접 배치한다. 이 명시적 override가 없을 때만 아래의 자동 경계를 적용한다.
        if (forcedPage !== undefined && forcedPage >= 0 && forcedPage < pages.length) {
            const targetPage = pages[forcedPage];
            const targetGap = customGap;
            const targetItemTotalHeight = measuredHeight + targetGap;

            targetPage.items.push(atom);
            targetPage.heightUsedPx += targetItemTotalHeight;
            continue;
        }

        const isForcedCurrentPage = forcedPage !== undefined && forcedPage === pages.length;

        // If an item is a header (e.g., 'career-header'), check if the NEXT item fits on this page too.
        // If header fits but next item doesn't, push header to next page so it's not orphaned.
        let pushHeaderToNextPage = false;
        if (!isForcedCurrentPage && atom.isHeader && i + 1 < atoms.length) {
            const nextAtom = atoms[i + 1];
            const nextHeight = itemHeights.get(nextAtom.id) ?? getAtomEstimatedHeight(nextAtom);
            const nextCustomGap =
                sectionGaps[nextAtom.id] ??
                (nextAtom.isHeader ? sectionGaps[nextAtom.sectionId] : undefined) ??
                0;
            const nextGap = nextCustomGap;

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
            pageId: pageIdAt(pages.length),
            pageIndex: pages.length,
            items: currentPageItems,
            heightUsedPx: currentHeight,
        });
    }

    return pages.length > 0
        ? pages
        : [{ pageId: pageIdAt(0), pageIndex: 0, items: [], heightUsedPx: 0 }];
}
