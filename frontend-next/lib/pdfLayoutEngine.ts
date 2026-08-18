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

export function computeAtomHeightWithGap(
    atom: PrintAtomItem,
    itemHeights: Map<string, number>,
    sectionGaps: Record<string, number> = {}
): number {
    const measuredHeight = itemHeights.get(atom.id) ?? getAtomEstimatedHeight(atom);
    const gap =
        sectionGaps[atom.id] ?? (atom.isHeader ? sectionGaps[atom.sectionId] : undefined) ?? 0;
    return measuredHeight + gap;
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
 * 나란히 배치된 2-3열 행을 페이지 분할 시 하나의 단위로 묶기 위한 그룹 정보.
 * rowId는 표시되지 않는 그룹 식별용 키이고, columns는 열(region) 순서를 보존한
 * atom id 배열이다. measuredHeight는 좁아진 컬럼 폭에서 실제로 렌더링된 행 컨테이너의
 * DOM 실측 높이 — 개별 atom 높이는 1열 기준으로 동결돼 있어 열이 좁아지며 늘어난
 * 줄바꿈을 반영하지 못하므로, 있으면 이 값을 우선한다.
 */
export interface AtomRowGroup {
    rowId: string;
    columns: string[][];
    measuredHeight?: number;
}

/**
 * Packs ordered printable atom items into discrete page layers.
 * Uses item heights measured from DOM or fallback heights.
 * Ensures headers are not orphaned at page bottoms.
 * 2-3열 행(rowGroupsByAtomId로 표시)은 분할 시 항상 한 단위로 취급되어, 한 페이지에
 * 다 들어가지 않으면 통째로 다음 페이지로 넘어간다 — 컬럼끼리 서로 다른 페이지로
 * 찢어지지 않는다.
 */
export function partitionAtomsIntoPages(
    atoms: PrintAtomItem[],
    itemHeights: Map<string, number>,
    sectionGaps: Record<string, number> = {},
    forcedPageOverrides: Record<string, number> = {},
    contentHeightPx: number = CONTENT_HEIGHT_PX,
    stablePageIds: string[] = [],
    rowGroupsByAtomId: Map<string, AtomRowGroup> = new Map()
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

    const atomHeightWithGap = (atom: PrintAtomItem): number =>
        computeAtomHeightWithGap(atom, itemHeights, sectionGaps);

    // 나란히 배치된 2-3열 행은 페이지 분할 시 절대 컬럼끼리 찢어지면 안 되므로, 순차
    // 패킹 전에 행에 속한 atom들을 하나의 "pack unit"으로 미리 접어넣는다. 단일
    // atom(전체의 대다수)은 그대로 싱글턴 unit이 되어 기존 알고리즘과 동일하게 동작한다.
    type PackUnit =
        | { kind: 'single'; atom: PrintAtomItem }
        | {
              kind: 'group';
              atoms: PrintAtomItem[];
              columns: PrintAtomItem[][];
              measuredHeight?: number;
          };

    // 그룹(2-3열 행)의 높이는 가능하면 실제 렌더링된 행 컨테이너의 DOM 실측값
    // (measuredHeight)을 쓴다 — 컬럼별 atom 높이는 1열 기준으로 동결돼 있어 좁아진
    // 열의 실제 줄바꿈을 반영 못 하므로, 그 합/최댓값은 폴백으로만 쓴다.
    const groupHeight = (unit: Extract<PackUnit, { kind: 'group' }>): number => {
        if (unit.measuredHeight !== undefined) return unit.measuredHeight;
        return Math.max(
            ...unit.columns.map((col) => col.reduce((sum, a) => sum + atomHeightWithGap(a), 0)),
            0
        );
    };

    const atomsById = new Map(atoms.map((a) => [a.id, a]));
    const emitted = new Set<string>();
    const units: PackUnit[] = [];

    for (const atom of atoms) {
        if (emitted.has(atom.id)) continue;
        const group = rowGroupsByAtomId.get(atom.id);
        if (!group) {
            units.push({ kind: 'single', atom });
            emitted.add(atom.id);
            continue;
        }
        const columns = group.columns.map((colIds) =>
            colIds.map((id) => atomsById.get(id)).filter((a): a is PrintAtomItem => a !== undefined)
        );
        const groupAtoms = columns.flat();
        groupAtoms.forEach((a) => emitted.add(a.id));
        units.push({
            kind: 'group',
            atoms: groupAtoms,
            columns,
            measuredHeight: group.measuredHeight,
        });
    }

    for (let u = 0; u < units.length; u++) {
        const unit = units[u];
        const primaryAtom = unit.kind === 'single' ? unit.atom : unit.atoms[0];

        // 0px도 유효한 실측값이다. 조건부 렌더링으로 내용이 없는 atom을 `||`로
        // fallback 처리하면 화면에는 없는데 계산상으로만 수십~수백 px를 차지한다.
        // 그룹(2-3열 행)은 열끼리 나란히 렌더링되므로, 행 전체 높이는 각 열의 세로
        // 누적 높이 중 최댓값이다(합이 아니다).
        const unitHeight =
            unit.kind === 'single' ? atomHeightWithGap(unit.atom) : groupHeight(unit);

        const forcedPage = forcedPageOverrides[primaryAtom.id];

        // 순차 패킹이 이미 다음 페이지로 넘어간 뒤에도 사용자가 지정한 페이지에
        // 직접 배치한다. 이 명시적 override가 없을 때만 아래의 자동 경계를 적용한다.
        //
        // forcedPage는 버튼을 누른 "그 순간"의 절대 페이지 번호를 저장한다. 그
        // 뒤에 다른 섹션 제외/편집으로 자연 페이지 수 자체가 바뀌면(실제 발생
        // 확인됨 — 총 페이지 10→9), 저장된 번호가 가리키는 페이지가 이 시점엔
        // 아직 안 만들어졌을 수 있다(forcedPage >= pages.length). 예전엔 이 경우
        // 조용히 강제 배치를 무시하고 그냥 자연 순서대로 쌓았다 — "강제 배치됨"
        // 배너는 뜨는데 실제로는 같은 페이지 안에서 순서만 밀리는 버그가 났다
        // (실제 발생 확인됨, 간헐적). 목표 페이지가 아직 없으면 지금까지 만들어진
        // 마지막 페이지로 대신 보내 — 강제 이동이 항상 눈에 보이는 효과를 내게
        // 한다(제자리에 머무는 것보다 "너무 안 올라가는" 쪽이 사용자 의도에 더
        // 가깝다).
        const isStaleForcedPage = forcedPage !== undefined && forcedPage > pages.length;
        if (
            forcedPage !== undefined &&
            forcedPage >= 0 &&
            (forcedPage < pages.length || (isStaleForcedPage && pages.length > 0))
        ) {
            const targetPage = pages[Math.min(forcedPage, pages.length - 1)];
            const unitAtoms = unit.kind === 'single' ? [unit.atom] : unit.atoms;
            for (const a of unitAtoms) {
                targetPage.items.push(a);
                targetPage.heightUsedPx += atomHeightWithGap(a);
            }
            continue;
        }

        const isForcedCurrentPage = forcedPage !== undefined && forcedPage === pages.length;

        // If a lone header (e.g., 'career-header') fits on this page but the next unit
        // doesn't, push the header to the next page so it's not orphaned. 그룹(행) unit은
        // 이 대상이 아니다 — 행 자체가 "고아"가 되는 개념은 없다.
        let pushHeaderToNextPage = false;
        if (
            !isForcedCurrentPage &&
            unit.kind === 'single' &&
            unit.atom.isHeader &&
            u + 1 < units.length
        ) {
            const nextUnit = units[u + 1];
            const nextHeight =
                nextUnit.kind === 'single'
                    ? atomHeightWithGap(nextUnit.atom)
                    : groupHeight(nextUnit);

            if (
                currentHeight + unitHeight + nextHeight > maxContentHeight &&
                currentPageItems.length > 0
            ) {
                pushHeaderToNextPage = true;
            }
        }

        if (
            !isForcedCurrentPage &&
            ((currentHeight + unitHeight > maxContentHeight && currentPageItems.length > 0) ||
                pushHeaderToNextPage)
        ) {
            startNewPage();
        }

        const unitAtoms = unit.kind === 'single' ? [unit.atom] : unit.atoms;
        currentPageItems.push(...unitAtoms);
        currentHeight += unitHeight;
    }

    if (currentPageItems.length > 0) {
        pages.push({
            pageId: pageIdAt(pages.length),
            pageIndex: pages.length,
            items: currentPageItems,
            heightUsedPx: currentHeight,
        });
    }

    // 강제 배치(locked)된 atom의 높이는 위 순차 패킹의 currentHeight 누적에
    // 전혀 안 들어간다 — 그냥 목표 페이지의 heightUsedPx에만 더해질 뿐이다.
    // 그래서 회사 카드 하나를 통째로 강제 배치하는 것처럼 큰 그룹이 한
    // 페이지에 다 안 들어갈 만큼 쌓이면, 여기서 계산하는 자연 페이지 수
    // (pages.length)가 실제보다 적게 잡힌다. 이 수가 maxPageCount로 쓰이는
    // rebalancePageOverflow의 push는 그 한도를 못 넘어 새 페이지를 못 만들고,
    // 넘친 내용이 페이지 경계를 그냥 뚫고 나갔다(실제 발생 확인됨). 예산을
    // 넘긴 각 페이지마다 그 넘친 만큼을 페이지 개수로 환산해 배열 끝에 빈
    // 페이지로 덧붙인다 — 실제 내용 배치는 row/rebalance 엔진(push)이 나중에
    // 이 빈 페이지들로 밀어넣으므로 여기선 개수만 맞추면 된다.
    let phantomPageCount = 0;
    for (const page of pages) {
        if (page.heightUsedPx > maxContentHeight) {
            phantomPageCount += Math.floor(page.heightUsedPx / maxContentHeight);
        }
    }
    for (let i = 0; i < phantomPageCount; i += 1) {
        pages.push({
            pageId: pageIdAt(pages.length),
            pageIndex: pages.length,
            items: [],
            heightUsedPx: 0,
        });
    }

    return pages.length > 0
        ? pages
        : [{ pageId: pageIdAt(0), pageIndex: 0, items: [], heightUsedPx: 0 }];
}
