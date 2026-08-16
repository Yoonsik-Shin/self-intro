import type { PageOrientation } from '@/lib/pdfLayoutEngine';

export const OUTPUT_LAYOUT_SCHEMA_VERSION = 3;

export type OutputLayoutMode = 'SINGLE_COLUMN' | 'TWO_COLUMN' | 'THREE_COLUMN' | 'FOUR_COLUMN';
export type OutputRegionKind = 'FLOW' | 'LEFT_COLUMN' | 'RIGHT_COLUMN' | 'COLUMN';

export type OutputPageMargins = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};

export type OutputPage = {
    id: string;
    orientation: PageOrientation;
    layoutMode: OutputLayoutMode;
    regionIds: string[];
    rowIds: string[];
};

export type OutputRow = {
    id: string;
    pageId: string;
    order: number;
    layoutMode: OutputLayoutMode;
    regionIds: string[];
    gapMm: number;
};

export type OutputRegion = {
    id: string;
    pageId: string;
    rowId: string;
    kind: OutputRegionKind;
    order: number;
    widthFraction: number;
    gapPx: number;
};

export type OutputPlacement = {
    atomId: string;
    pageId: string;
    regionId: string;
    order: number;
    columnSpan: number;
    rowSpan: number;
    /** 열/행 좌표와 별개로 사용자가 페이지를 직접 고정했는지 나타낸다. */
    pageLocked: boolean;
};

/**
 * 출력 문구/원본과 독립적으로 보존하는 페이지 배치 스냅샷이다.
 *
 * placement는 page/row/column 안의 화면 좌표를 저장한다. 이 좌표만으로 paginator의 페이지를
 * 강제하지 않으며, 사용자가 명시적으로 "N페이지로 강제"를 누른 경우에만 pageLocked가 true다.
 * 따라서 Notion식 좌우 배치와 강제 페이지 override는 같은 객체를 쓰되 서로 독립적으로 동작한다.
 */
export type OutputLayout = {
    schemaVersion: number;
    pages: OutputPage[];
    rows: OutputRow[];
    regions: OutputRegion[];
    placements: OutputPlacement[];
    pageMargins: OutputPageMargins;
    /** 문서 전체 타이포그래피 배율. 1은 템플릿 기본 크기다. */
    fontScale: number;
};

export type StoredPrintLayoutSettings = {
    sectionGaps: Record<string, number>;
    forcedPageOverrides: Record<string, number>;
    outputLayout: OutputLayout;
    itemOrderOverrides: Record<string, string[]>;
};

const DEFAULT_PAGE_ID = 'page-1';
const DEFAULT_ROW_ID = 'page-1-row-1';
const DEFAULT_REGION_ID = 'page-1-flow';
export const DEFAULT_OUTPUT_PAGE_MARGINS: OutputPageMargins = {
    top: 12,
    right: 14,
    bottom: 12,
    left: 14,
};

export function createDefaultOutputLayout(): OutputLayout {
    return {
        schemaVersion: OUTPUT_LAYOUT_SCHEMA_VERSION,
        pages: [
            {
                id: DEFAULT_PAGE_ID,
                orientation: 'portrait',
                layoutMode: 'SINGLE_COLUMN',
                regionIds: [DEFAULT_REGION_ID],
                rowIds: [DEFAULT_ROW_ID],
            },
        ],
        rows: [
            {
                id: DEFAULT_ROW_ID,
                pageId: DEFAULT_PAGE_ID,
                order: 0,
                layoutMode: 'SINGLE_COLUMN',
                regionIds: [DEFAULT_REGION_ID],
                gapMm: 6,
            },
        ],
        regions: [
            {
                id: DEFAULT_REGION_ID,
                pageId: DEFAULT_PAGE_ID,
                rowId: DEFAULT_ROW_ID,
                kind: 'FLOW',
                order: 0,
                widthFraction: 1,
                gapPx: 0,
            },
        ],
        placements: [],
        pageMargins: { ...DEFAULT_OUTPUT_PAGE_MARGINS },
        fontScale: 1,
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeForcedPageOverrides(value: unknown): Record<string, number> {
    if (!isRecord(value)) return {};
    return Object.fromEntries(
        Object.entries(value).filter(
            (entry): entry is [string, number] =>
                Number.isInteger(entry[1]) && (entry[1] as number) >= 0
        )
    );
}

function normalizeItemOrderOverrides(value: unknown): Record<string, string[]> {
    if (!isRecord(value)) return {};
    return Object.fromEntries(
        Object.entries(value).flatMap(([scopeId, order]) => {
            if (!Array.isArray(order)) return [];
            return [[scopeId, order.filter((id): id is string => typeof id === 'string')]];
        })
    );
}

/**
 * PrintTemplate.sectionGaps에 함께 저장했던 레거시 예약 필드를 한 경계에서 분리한다.
 * 숫자 간격만 실제 sectionGaps로 통과시키므로 손상된 JSON이 렌더링 계산에 섞이지 않는다.
 */
export function parseStoredPrintLayout(value: unknown): StoredPrintLayoutSettings {
    const raw = isRecord(value) ? value : {};
    const sectionGaps = Object.fromEntries(
        Object.entries(raw).filter(
            (entry): entry is [string, number] =>
                !entry[0].startsWith('__') &&
                typeof entry[1] === 'number' &&
                Number.isFinite(entry[1])
        )
    );
    const forcedPageOverrides = normalizeForcedPageOverrides(raw.__forcedPageOverrides);
    const outputLayout = isRecord(raw.__outputLayout)
        ? normalizeOutputLayout(raw.__outputLayout)
        : createOutputLayoutFromLegacy(forcedPageOverrides);

    return {
        sectionGaps,
        forcedPageOverrides: outputLayoutToForcedPageOverrides(outputLayout),
        outputLayout,
        itemOrderOverrides: normalizeItemOrderOverrides(raw.__itemOrderOverrides),
    };
}

/** 서버 JSON에 저장할 때도 동일한 규격을 사용해 로드 경로와의 드리프트를 막는다. */
export function serializeStoredPrintLayout(
    settings: StoredPrintLayoutSettings
): Record<string, unknown> {
    const outputLayout = normalizeOutputLayout(settings.outputLayout);
    return {
        ...settings.sectionGaps,
        __forcedPageOverrides: outputLayoutToForcedPageOverrides(outputLayout),
        __itemOrderOverrides: normalizeItemOrderOverrides(settings.itemOrderOverrides),
        __outputLayout: outputLayout,
    };
}

function pageNumber(id: string): number {
    const match = /^page-(\d+)$/.exec(id);
    return match ? Number(match[1]) : 0;
}

function nextPageNumber(layout: OutputLayout): number {
    return Math.max(0, ...layout.pages.map((page) => pageNumber(page.id))) + 1;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function normalizePageMargins(value: unknown): OutputPageMargins {
    const source = isRecord(value) ? value : {};
    return {
        top: clamp(typeof source.top === 'number' ? source.top : 12, 0, 50),
        right: clamp(typeof source.right === 'number' ? source.right : 14, 0, 50),
        bottom: clamp(typeof source.bottom === 'number' ? source.bottom : 12, 0, 50),
        left: clamp(typeof source.left === 'number' ? source.left : 14, 0, 50),
    };
}

function columnCountForMode(mode: OutputLayoutMode): number {
    if (mode === 'FOUR_COLUMN') return 4;
    if (mode === 'THREE_COLUMN') return 3;
    if (mode === 'TWO_COLUMN') return 2;
    return 1;
}

function modeForColumnCount(count: number): OutputLayoutMode {
    if (count >= 4) return 'FOUR_COLUMN';
    if (count === 3) return 'THREE_COLUMN';
    if (count === 2) return 'TWO_COLUMN';
    return 'SINGLE_COLUMN';
}

function createRow(
    pageId: string,
    rowNumber: number,
    columnCount = 1
): { row: OutputRow; regions: OutputRegion[] } {
    const rowId = `${pageId}-row-${rowNumber}`;
    const normalizedCount = clamp(Math.round(columnCount), 1, 4);
    const mode = modeForColumnCount(normalizedCount);
    const regions = Array.from({ length: normalizedCount }, (_, index): OutputRegion => {
        const legacyKind: OutputRegionKind =
            normalizedCount === 1
                ? 'FLOW'
                : normalizedCount === 2
                  ? index === 0
                      ? 'LEFT_COLUMN'
                      : 'RIGHT_COLUMN'
                  : 'COLUMN';
        return {
            id: `${rowId}-column-${index + 1}`,
            pageId,
            rowId,
            kind: legacyKind,
            order: index,
            widthFraction: 1 / normalizedCount,
            gapPx: 0,
        };
    });
    return {
        row: {
            id: rowId,
            pageId,
            order: rowNumber - 1,
            layoutMode: mode,
            regionIds: regions.map((region) => region.id),
            gapMm: 6,
        },
        regions,
    };
}

function createPage(number: number): {
    page: OutputPage;
    row: OutputRow;
    regions: OutputRegion[];
} {
    const pageId = `page-${number}`;
    const { row, regions } = createRow(pageId, 1, 1);
    return {
        page: {
            id: pageId,
            orientation: 'portrait',
            layoutMode: 'SINGLE_COLUMN',
            regionIds: regions.map((region) => region.id),
            rowIds: [row.id],
        },
        row,
        regions,
    };
}

export function ensureOutputLayoutPageCount(
    source: OutputLayout,
    requestedCount: number
): OutputLayout {
    const layout = normalizeOutputLayout(source);
    const targetCount = Math.max(1, requestedCount);
    if (layout.pages.length >= targetCount) return layout;

    const pages = [...layout.pages];
    const rows = [...layout.rows];
    const regions = [...layout.regions];
    let number = nextPageNumber(layout);
    while (pages.length < targetCount) {
        const next = createPage(number++);
        pages.push(next.page);
        rows.push(next.row);
        regions.push(...next.regions);
    }
    return { ...layout, pages, rows, regions };
}

export function createOutputLayoutFromLegacy(
    forcedPageOverrides: Record<string, number> = {}
): OutputLayout {
    const requestedPageCount =
        Math.max(0, ...Object.values(forcedPageOverrides).filter(Number.isInteger)) + 1;
    const layout = ensureOutputLayoutPageCount(createDefaultOutputLayout(), requestedPageCount);
    const placements = Object.entries(forcedPageOverrides)
        .filter(([, pageIndex]) => Number.isInteger(pageIndex) && pageIndex >= 0)
        .map(([atomId, pageIndex], order) => {
            const page = layout.pages[pageIndex] ?? layout.pages[0];
            return {
                atomId,
                pageId: page.id,
                regionId: page.regionIds[0],
                order,
                columnSpan: 1,
                rowSpan: 1,
                pageLocked: true,
            } satisfies OutputPlacement;
        });
    return { ...layout, placements };
}

/** 손상되거나 이전 버전인 JSON도 기존 자동 flow로 안전하게 복구한다. */
export function normalizeOutputLayout(value: unknown): OutputLayout {
    if (!isRecord(value) || !Array.isArray(value.pages) || !Array.isArray(value.regions)) {
        return createDefaultOutputLayout();
    }

    const parsedPages = value.pages
        .filter(isRecord)
        .map((page): OutputPage | null => {
            if (typeof page.id !== 'string' || !Array.isArray(page.regionIds)) return null;
            const layoutMode: OutputLayoutMode =
                page.layoutMode === 'FOUR_COLUMN'
                    ? 'FOUR_COLUMN'
                    : page.layoutMode === 'THREE_COLUMN'
                      ? 'THREE_COLUMN'
                      : page.layoutMode === 'TWO_COLUMN'
                        ? 'TWO_COLUMN'
                        : 'SINGLE_COLUMN';
            return {
                id: page.id,
                orientation: page.orientation === 'landscape' ? 'landscape' : 'portrait',
                layoutMode,
                regionIds: page.regionIds.filter(
                    (regionId): regionId is string => typeof regionId === 'string'
                ),
                rowIds: Array.isArray(page.rowIds)
                    ? page.rowIds.filter((rowId): rowId is string => typeof rowId === 'string')
                    : [],
            };
        })
        .filter((page): page is OutputPage => page !== null);

    if (parsedPages.length === 0) return createDefaultOutputLayout();
    const pageIds = new Set(parsedPages.map((page) => page.id));

    const rawRegions = value.regions
        .filter(isRecord)
        .map((region): OutputRegion | null => {
            if (
                typeof region.id !== 'string' ||
                typeof region.pageId !== 'string' ||
                !pageIds.has(region.pageId)
            ) {
                return null;
            }
            const kind: OutputRegionKind =
                region.kind === 'COLUMN' ||
                region.kind === 'LEFT_COLUMN' ||
                region.kind === 'RIGHT_COLUMN'
                    ? region.kind
                    : 'FLOW';
            return {
                id: region.id,
                pageId: region.pageId,
                rowId: typeof region.rowId === 'string' ? region.rowId : '',
                kind,
                order: typeof region.order === 'number' ? region.order : 0,
                widthFraction: typeof region.widthFraction === 'number' ? region.widthFraction : 1,
                gapPx: typeof region.gapPx === 'number' ? Math.max(0, region.gapPx) : 0,
            };
        })
        .filter((region): region is OutputRegion => region !== null);
    if (rawRegions.length === 0) return createDefaultOutputLayout();
    const rawRegionIds = new Set(rawRegions.map((region) => region.id));

    let rows: OutputRow[] = [];
    if (Array.isArray(value.rows)) {
        rows = value.rows
            .filter(isRecord)
            .map((row): OutputRow | null => {
                if (
                    typeof row.id !== 'string' ||
                    typeof row.pageId !== 'string' ||
                    !pageIds.has(row.pageId) ||
                    !Array.isArray(row.regionIds)
                ) {
                    return null;
                }
                const regionIds = row.regionIds.filter(
                    (regionId): regionId is string =>
                        typeof regionId === 'string' && rawRegionIds.has(regionId)
                );
                if (regionIds.length === 0) return null;
                return {
                    id: row.id,
                    pageId: row.pageId,
                    order: typeof row.order === 'number' ? row.order : 0,
                    layoutMode: modeForColumnCount(regionIds.length),
                    regionIds,
                    gapMm: clamp(typeof row.gapMm === 'number' ? row.gapMm : 6, 0, 20),
                };
            })
            .filter((row): row is OutputRow => row !== null);
    }

    // v1 템플릿은 page의 region 묶음을 첫 Row로 승격한다.
    if (rows.length === 0) {
        rows = parsedPages.flatMap((page): OutputRow[] => {
            const regionIds = page.regionIds.filter((regionId) => rawRegionIds.has(regionId));
            if (regionIds.length === 0) return [];
            return [
                {
                    id: `${page.id}-row-1`,
                    pageId: page.id,
                    order: 0,
                    layoutMode: modeForColumnCount(regionIds.length),
                    regionIds,
                    gapMm: 6,
                },
            ];
        });
    }
    if (rows.length === 0) return createDefaultOutputLayout();

    const rowByRegionId = new Map(
        rows.flatMap((row) => row.regionIds.map((regionId) => [regionId, row] as const))
    );
    const normalizedRegions = rawRegions
        .map((region): OutputRegion | null => {
            const row = rowByRegionId.get(region.id);
            return row && row.pageId === region.pageId ? { ...region, rowId: row.id } : null;
        })
        .filter((region): region is OutputRegion => region !== null);
    const normalizedRegionIds = new Set(normalizedRegions.map((region) => region.id));
    const normalizedRows = rows
        .map((row): OutputRow | null => {
            const regionIds = row.regionIds.filter((regionId) => normalizedRegionIds.has(regionId));
            return regionIds.length > 0
                ? { ...row, regionIds, layoutMode: modeForColumnCount(regionIds.length) }
                : null;
        })
        .filter((row): row is OutputRow => row !== null)
        .sort((left, right) => left.order - right.order);
    const normalizedRowIds = new Set(normalizedRows.map((row) => row.id));

    const widthSumByRowId = new Map<string, number>();
    normalizedRegions.forEach((region) =>
        widthSumByRowId.set(
            region.rowId,
            (widthSumByRowId.get(region.rowId) ?? 0) + Math.max(0.05, region.widthFraction)
        )
    );
    const widthNormalizedRegions = normalizedRegions.map((region) => ({
        ...region,
        widthFraction:
            Math.max(0.05, region.widthFraction) / (widthSumByRowId.get(region.rowId) ?? 1),
    }));

    const normalizedPages = parsedPages
        .map((page): OutputPage | null => {
            const pageRows = normalizedRows
                .filter((row) => row.pageId === page.id && normalizedRowIds.has(row.id))
                .sort((left, right) => left.order - right.order);
            if (pageRows.length === 0) return null;
            return {
                ...page,
                rowIds: pageRows.map((row) => row.id),
                regionIds: pageRows.flatMap((row) => row.regionIds),
                layoutMode: pageRows.length === 1 ? pageRows[0].layoutMode : 'SINGLE_COLUMN',
            };
        })
        .filter((page): page is OutputPage => page !== null);
    if (normalizedPages.length === 0) return createDefaultOutputLayout();
    const normalizedPageIds = new Set(normalizedPages.map((page) => page.id));

    const placements = Array.isArray(value.placements)
        ? value.placements
              .filter(isRecord)
              .map((placement): OutputPlacement | null => {
                  if (
                      typeof placement.atomId !== 'string' ||
                      typeof placement.pageId !== 'string' ||
                      typeof placement.regionId !== 'string' ||
                      !normalizedPageIds.has(placement.pageId) ||
                      !normalizedRegionIds.has(placement.regionId)
                  ) {
                      return null;
                  }
                  return {
                      atomId: placement.atomId,
                      pageId: placement.pageId,
                      regionId: placement.regionId,
                      order: typeof placement.order === 'number' ? placement.order : 0,
                      columnSpan:
                          typeof placement.columnSpan === 'number'
                              ? Math.max(1, placement.columnSpan)
                              : 1,
                      rowSpan:
                          typeof placement.rowSpan === 'number'
                              ? Math.max(1, placement.rowSpan)
                              : 1,
                      pageLocked: placement.pageLocked === true,
                  };
              })
              .filter((placement): placement is OutputPlacement => placement !== null)
        : [];

    return {
        schemaVersion: OUTPUT_LAYOUT_SCHEMA_VERSION,
        pages: normalizedPages,
        rows: normalizedRows.filter((row) => normalizedPageIds.has(row.pageId)),
        regions: widthNormalizedRegions.filter((region) => normalizedPageIds.has(region.pageId)),
        placements,
        pageMargins: normalizePageMargins(value.pageMargins),
        fontScale: clamp(
            typeof value.fontScale === 'number' && Number.isFinite(value.fontScale)
                ? value.fontScale
                : 1,
            0.8,
            1.3
        ),
    };
}

/**
 * atom들을 region의 특정 위치(anchor)에 강제 배치(pageLocked: true)한다. 순서 계산은
 * insertAtomsIntoOutputRegion에 그대로 위임하므로 region 안의 기존 이웃들과 무관하게
 * 값이 뒤죽박죽 커지는 일이 없다.
 */
export function forceAtomsIntoRegion(
    source: OutputLayout,
    atomIds: string[],
    regionId: string,
    anchor: { atomId: string; position: 'before' | 'after' } | null
): OutputLayout {
    if (atomIds.length === 0) return normalizeOutputLayout(source);
    const moved = insertAtomsIntoOutputRegion(source, atomIds, regionId, anchor);
    const atomIdSet = new Set(atomIds);
    return {
        ...moved,
        placements: moved.placements.map((placement) =>
            atomIdSet.has(placement.atomId) ? { ...placement, pageLocked: true } : placement
        ),
    };
}

export function forceAtomsToPage(
    source: OutputLayout,
    atomIds: string[],
    pageIndex: number
): OutputLayout {
    const layout = ensureOutputLayoutPageCount(source, pageIndex + 1);
    const page = layout.pages[Math.max(0, pageIndex)] ?? layout.pages[0];
    const regionId = page.regionIds[0];
    if (!regionId || atomIds.length === 0) return layout;
    return forceAtomsIntoRegion(layout, atomIds, regionId, null);
}

export function clearAtomPlacements(source: OutputLayout, atomIds: string[]): OutputLayout {
    const atomIdSet = new Set(atomIds);
    const layout = normalizeOutputLayout(source);
    return {
        ...layout,
        placements: layout.placements.map((item) =>
            atomIdSet.has(item.atomId) ? { ...item, pageLocked: false } : item
        ),
    };
}

/** 페이지 단위 레이아웃을 바꾸되 다른 페이지와 atom 순서는 보존한다. */
export function setOutputPageLayoutMode(
    source: OutputLayout,
    pageIndex: number,
    mode: OutputLayoutMode
): OutputLayout {
    const layout = ensureOutputLayoutPageCount(source, Math.max(0, pageIndex) + 1);
    const page = layout.pages[Math.max(0, pageIndex)] ?? layout.pages[0];
    const columnCount = columnCountForMode(mode);
    const { row: nextRow, regions: nextRegions } = createRow(page.id, 1, columnCount);
    const fallbackRegionId = nextRegions[0].id;
    const pages = layout.pages.map((item) =>
        item.id === page.id
            ? {
                  ...item,
                  layoutMode: mode,
                  rowIds: [nextRow.id],
                  regionIds: nextRegions.map((region) => region.id),
              }
            : item
    );
    const rows = [...layout.rows.filter((row) => row.pageId !== page.id), nextRow];
    const regions = [
        ...layout.regions.filter((region) => region.pageId !== page.id),
        ...nextRegions,
    ];
    const placements = layout.placements.map((placement) =>
        placement.pageId === page.id
            ? { ...placement, regionId: fallbackRegionId, columnSpan: 1 }
            : placement
    );

    return { ...layout, pages, rows, regions, placements };
}

export function setOutputPageMargins(
    source: OutputLayout,
    margins: Partial<OutputPageMargins>
): OutputLayout {
    const layout = normalizeOutputLayout(source);
    return {
        ...layout,
        pageMargins: normalizePageMargins({ ...layout.pageMargins, ...margins }),
    };
}

export function addOutputRow(
    source: OutputLayout,
    pageIndex: number,
    columnCount: number
): OutputLayout {
    const layout = ensureOutputLayoutPageCount(source, Math.max(0, pageIndex) + 1);
    const page = layout.pages[Math.max(0, pageIndex)] ?? layout.pages[0];
    const pageRows = layout.rows.filter((row) => row.pageId === page.id);
    const nextNumber = pageRows.length + 1;
    const { row, regions } = createRow(page.id, nextNumber, columnCount);
    return {
        ...layout,
        pages: layout.pages.map((item) =>
            item.id === page.id
                ? {
                      ...item,
                      layoutMode: 'SINGLE_COLUMN',
                      rowIds: [...item.rowIds, row.id],
                      regionIds: [...item.regionIds, ...row.regionIds],
                  }
                : item
        ),
        rows: [...layout.rows, row],
        regions: [...layout.regions, ...regions],
    };
}

/**
 * 화면에서 확정한 블록 행/열 구성을 한 페이지의 저장 모델로 치환한다.
 * 각 문자열 배열은 한 열에 함께 속하는 atom 묶음이고, 바깥 배열은 위에서 아래 행 순서다.
 * Notion처럼 블록을 옆에 놓을 때 UI가 현재 시각 순서를 보존한 composition을 넘긴다.
 */
export function replaceOutputPageComposition(
    source: OutputLayout,
    pageIndex: number,
    composition: string[][][]
): OutputLayout {
    const layout = ensureOutputLayoutPageCount(source, Math.max(0, pageIndex) + 1);
    const page = layout.pages[Math.max(0, pageIndex)] ?? layout.pages[0];
    const normalizedComposition = composition
        .map((columns) =>
            columns
                .slice(0, 4)
                .map((atomIds) => [...new Set(atomIds.filter(Boolean))])
                .filter((atomIds) => atomIds.length > 0)
        )
        .filter((columns) => columns.length > 0);
    if (normalizedComposition.length === 0) return layout;

    const oldRowIds = new Set(
        layout.rows.filter((row) => row.pageId === page.id).map((row) => row.id)
    );
    const oldRegionIds = new Set(
        layout.regions.filter((region) => region.pageId === page.id).map((region) => region.id)
    );
    const composedAtomIds = new Set(normalizedComposition.flat(2));
    const nextRows: OutputRow[] = [];
    const nextRegions: OutputRegion[] = [];
    const nextPlacements: OutputPlacement[] = [];
    const previousPlacementByAtomId = new Map(
        layout.placements.map((placement) => [placement.atomId, placement])
    );

    normalizedComposition.forEach((columns, rowIndex) => {
        const { row, regions } = createRow(page.id, rowIndex + 1, columns.length);
        nextRows.push(row);
        nextRegions.push(...regions);
        columns.forEach((atomIds, columnIndex) => {
            atomIds.forEach((atomId, order) => {
                nextPlacements.push({
                    atomId,
                    pageId: page.id,
                    regionId: regions[columnIndex].id,
                    order,
                    columnSpan: 1,
                    rowSpan: 1,
                    pageLocked: previousPlacementByAtomId.get(atomId)?.pageLocked === true,
                });
            });
        });
    });

    const nextPage: OutputPage = {
        ...page,
        layoutMode: nextRows.length === 1 ? nextRows[0].layoutMode : 'SINGLE_COLUMN',
        rowIds: nextRows.map((row) => row.id),
        regionIds: nextRegions.map((region) => region.id),
    };
    return {
        ...layout,
        pages: layout.pages.map((item) => (item.id === page.id ? nextPage : item)),
        rows: [...layout.rows.filter((row) => !oldRowIds.has(row.id)), ...nextRows],
        regions: [
            ...layout.regions.filter((region) => !oldRegionIds.has(region.id)),
            ...nextRegions,
        ],
        placements: [
            ...layout.placements.filter(
                (placement) =>
                    placement.pageId !== page.id && !composedAtomIds.has(placement.atomId)
            ),
            ...nextPlacements,
        ],
    };
}

export function setOutputRowColumnCount(
    source: OutputLayout,
    rowId: string,
    columnCount: number
): OutputLayout {
    const layout = normalizeOutputLayout(source);
    const currentRow = layout.rows.find((row) => row.id === rowId);
    if (!currentRow) return layout;
    const pageRows = layout.rows
        .filter((row) => row.pageId === currentRow.pageId)
        .sort((left, right) => left.order - right.order);
    const rowNumber = pageRows.findIndex((row) => row.id === rowId) + 1;
    const { row: replacement, regions: nextRegions } = createRow(
        currentRow.pageId,
        Math.max(1, rowNumber),
        columnCount
    );
    const stableRow = { ...replacement, id: currentRow.id, order: currentRow.order };
    const stableRegions = nextRegions.map((region, index) => ({
        ...region,
        id: `${currentRow.id}-column-${index + 1}`,
        rowId: currentRow.id,
    }));
    stableRow.regionIds = stableRegions.map((region) => region.id);
    const oldRegionIds = new Set(currentRow.regionIds);
    const fallbackRegionId = stableRegions[0].id;
    const rows = layout.rows.map((row) => (row.id === rowId ? stableRow : row));
    const regions = [
        ...layout.regions.filter((region) => !oldRegionIds.has(region.id)),
        ...stableRegions,
    ];
    const mergedOrder = new Map(
        layout.placements
            .filter((placement) => oldRegionIds.has(placement.regionId))
            .sort((a, b) => {
                const columnA = currentRow.regionIds.indexOf(a.regionId);
                const columnB = currentRow.regionIds.indexOf(b.regionId);
                if (columnA !== columnB) return columnA - columnB;
                return a.order - b.order;
            })
            .map((placement, index) => [placement.atomId, index])
    );
    const placements = layout.placements.map((placement) =>
        oldRegionIds.has(placement.regionId)
            ? {
                  ...placement,
                  regionId: fallbackRegionId,
                  order: mergedOrder.get(placement.atomId) ?? placement.order,
              }
            : placement
    );
    const pages = layout.pages.map((page) => {
        if (page.id !== currentRow.pageId) return page;
        const pageRowIds = rows
            .filter((row) => row.pageId === page.id)
            .sort((left, right) => left.order - right.order)
            .map((row) => row.id);
        const pageRegionIds = pageRowIds.flatMap(
            (id) => rows.find((row) => row.id === id)?.regionIds ?? []
        );
        return {
            ...page,
            rowIds: pageRowIds,
            regionIds: pageRegionIds,
            layoutMode: pageRowIds.length === 1 ? stableRow.layoutMode : 'SINGLE_COLUMN',
        };
    });
    return { ...layout, pages, rows, regions, placements };
}

/**
 * 모든 region에 placement가 하나도 없는 완전히 빈 행을 제거한다. 2/3열 재배치로
 * 어떤 행의 컬럼이 전부 다른 곳으로 옮겨지면 빈 껍데기 행이 남는데,
 * mergeAdjacentSingleColumnRows는 섹션을 모르는 빈 행과는 절대 병합하지 않아
 * (getRowSectionId가 undefined를 반환) 이 껍데기가 자동으로 정리되지 않고
 * 영원히 남는다 — 편집 화면에서 min-h-[24mm]짜리 빈 박스로 계속 보이는 원인이
 * 됐다(실제 리포트된 버그).
 */
export function pruneEmptyOutputRows(layout: OutputLayout): OutputLayout {
    const placedRegionIds = new Set(layout.placements.map((p) => p.regionId));
    const emptyRowIds = new Set(
        layout.rows
            .filter((row) => row.regionIds.every((regionId) => !placedRegionIds.has(regionId)))
            .map((row) => row.id)
    );
    if (emptyRowIds.size === 0) return layout;

    const emptyRegionIds = new Set(
        layout.regions.filter((region) => emptyRowIds.has(region.rowId)).map((region) => region.id)
    );
    const remainingRows = layout.rows.filter((row) => !emptyRowIds.has(row.id));
    const regions = layout.regions.filter((region) => !emptyRegionIds.has(region.id));

    const rows = layout.pages.flatMap((page) =>
        remainingRows
            .filter((row) => row.pageId === page.id)
            .sort((a, b) => a.order - b.order)
            .map((row, index) => ({ ...row, order: index }))
    );

    const pages = layout.pages.map((page) => {
        const pageRows = rows.filter((row) => row.pageId === page.id);
        return {
            ...page,
            rowIds: pageRows.map((row) => row.id),
            regionIds: pageRows.flatMap((row) => row.regionIds),
        };
    });

    return { ...layout, rows, regions, pages };
}

/**
 * 인접한 두 단일열 행을 하나로 합친다. rowA/rowB가 같은 섹션(구성)에 속하는지는
 * 이 함수가 모른다 — atomId 문자열만 다루는 데이터 모델 계층이라 섹션 개념이
 * 없다. 그래서 항상 무조건 병합하지 않고, sectionId를 아는 호출부(PrintCanvas.tsx)가
 * "이 두 행은 같은 섹션이다"를 확인한 뒤에만 호출해야 한다 — 그렇지 않으면 서로
 * 다른 섹션의 내용이 한 region으로 섞여버린다(과거 실제 발생한 버그).
 */
export function mergeAdjacentSingleColumnRows(
    layout: OutputLayout,
    rowAId: string,
    rowBId: string
): OutputLayout {
    const rowA = layout.rows.find((row) => row.id === rowAId);
    const rowB = layout.rows.find((row) => row.id === rowBId);
    if (!rowA || !rowB) return layout;
    if (rowA.pageId !== rowB.pageId) return layout;
    if (rowA.regionIds.length !== 1 || rowB.regionIds.length !== 1) return layout;

    const [keepRow, dropRow] = rowA.order <= rowB.order ? [rowA, rowB] : [rowB, rowA];
    const keepRegionId = keepRow.regionIds[0];
    const dropRegionId = dropRow.regionIds[0];

    const orderedAtomIds = [
        ...layout.placements
            .filter((placement) => placement.regionId === keepRegionId)
            .sort((a, b) => a.order - b.order)
            .map((placement) => placement.atomId),
        ...layout.placements
            .filter((placement) => placement.regionId === dropRegionId)
            .sort((a, b) => a.order - b.order)
            .map((placement) => placement.atomId),
    ];
    const orderMap = new Map(orderedAtomIds.map((atomId, index) => [atomId, index]));

    const placements = layout.placements.map((placement) => {
        if (placement.regionId === dropRegionId) {
            return {
                ...placement,
                regionId: keepRegionId,
                order: orderMap.get(placement.atomId) ?? placement.order,
            };
        }
        if (placement.regionId === keepRegionId) {
            return { ...placement, order: orderMap.get(placement.atomId) ?? placement.order };
        }
        return placement;
    });

    const rows = layout.rows.filter((row) => row.id !== dropRow.id);
    const pageRowsOrdered = rows
        .filter((row) => row.pageId === keepRow.pageId)
        .sort((a, b) => a.order - b.order);
    const reNumberedRows = rows.map((row) =>
        row.pageId === keepRow.pageId
            ? { ...row, order: pageRowsOrdered.findIndex((item) => item.id === row.id) }
            : row
    );

    const regions = layout.regions.filter((region) => region.id !== dropRegionId);

    const pages = layout.pages.map((page) => {
        if (page.id !== keepRow.pageId) return page;
        const pageRowIds = reNumberedRows
            .filter((row) => row.pageId === page.id)
            .sort((a, b) => a.order - b.order)
            .map((row) => row.id);
        const pageRegionIds = pageRowIds.flatMap(
            (id) => reNumberedRows.find((row) => row.id === id)?.regionIds ?? []
        );
        return { ...page, rowIds: pageRowIds, regionIds: pageRegionIds };
    });

    return { ...layout, pages, rows: reNumberedRows, regions, placements };
}

export function setOutputRowGap(source: OutputLayout, rowId: string, gapMm: number): OutputLayout {
    const layout = normalizeOutputLayout(source);
    return {
        ...layout,
        rows: layout.rows.map((row) =>
            row.id === rowId ? { ...row, gapMm: clamp(gapMm, 0, 20) } : row
        ),
    };
}

export function resizeOutputRegionPair(
    source: OutputLayout,
    leftRegionId: string,
    rightRegionId: string,
    leftShareOfPair: number
): OutputLayout {
    const layout = normalizeOutputLayout(source);
    const left = layout.regions.find((region) => region.id === leftRegionId);
    const right = layout.regions.find((region) => region.id === rightRegionId);
    if (!left || !right || left.rowId !== right.rowId) return layout;
    const pairTotal = left.widthFraction + right.widthFraction;
    const share = clamp(leftShareOfPair, 0.2, 0.8);
    return {
        ...layout,
        regions: layout.regions.map((region) => {
            if (region.id === left.id) return { ...region, widthFraction: pairTotal * share };
            if (region.id === right.id)
                return { ...region, widthFraction: pairTotal * (1 - share) };
            return region;
        }),
    };
}

/**
 * atom 묶음을 region 안의 특정 위치에 끼워넣는다. anchor가 없으면 기존 항목들 맨
 * 끝에 추가한다(placeAtomsInOutputRegionById의 기존 동작과 동일). anchor가 있으면
 * 그 atom 기준 앞/뒤에 정확히 삽입한다.
 */
export function insertAtomsIntoOutputRegion(
    source: OutputLayout,
    atomIds: string[],
    regionId: string,
    anchor: { atomId: string; position: 'before' | 'after' } | null
): OutputLayout {
    const layout = normalizeOutputLayout(source);
    const region = layout.regions.find((item) => item.id === regionId);
    if (!region || atomIds.length === 0) return layout;
    const atomIdSet = new Set(atomIds);
    const previousPlacementByAtomId = new Map(
        layout.placements.map((placement) => [placement.atomId, placement])
    );
    const oldRegionIds = new Set(
        atomIds
            .map((id) => previousPlacementByAtomId.get(id)?.regionId)
            .filter((id): id is string => Boolean(id))
    );

    // region 안의 기존 atom(옮겨지는 것들은 제외)을 순서대로 뽑고, anchor 위치를
    // 기준으로 새 atomIds를 끼워넣은 뒤 전체를 0..n-1로 재번호한다.
    const existingOrdered = layout.placements
        .filter((p) => p.regionId === region.id && !atomIdSet.has(p.atomId))
        .sort((a, b) => a.order - b.order)
        .map((p) => p.atomId);
    let insertIndex = existingOrdered.length;
    if (anchor) {
        const anchorIndex = existingOrdered.indexOf(anchor.atomId);
        if (anchorIndex >= 0) {
            insertIndex = anchor.position === 'after' ? anchorIndex + 1 : anchorIndex;
        }
    }
    const nextOrderedIds = [
        ...existingOrdered.slice(0, insertIndex),
        ...atomIds,
        ...existingOrdered.slice(insertIndex),
    ];
    const nextRegionPlacements = nextOrderedIds.map((atomId, order): OutputPlacement => {
        const previous = previousPlacementByAtomId.get(atomId);
        return {
            atomId,
            pageId: region.pageId,
            regionId: region.id,
            order,
            columnSpan: previous?.regionId === region.id ? previous.columnSpan : 1,
            rowSpan: previous?.regionId === region.id ? previous.rowSpan : 1,
            pageLocked: previous?.pageLocked === true,
        };
    });

    const preserved = layout.placements.filter(
        (item) => item.regionId !== region.id && !atomIdSet.has(item.atomId)
    );
    const nextPlacements = [...preserved, ...nextRegionPlacements];

    // 옮기고 난 뒤 완전히 빈 region은 그 행에서 제거하고, 행이 통째로 비면 행 자체도
    // 제거한다 — 그래야 2열이었던 행이 원래 각자 한 줄씩 차지하던 모습으로 되돌아간다.
    const stillOccupiedRegionIds = new Set(nextPlacements.map((p) => p.regionId));
    const emptiedRegionIds = new Set(
        [...oldRegionIds].filter((id) => id !== region.id && !stillOccupiedRegionIds.has(id))
    );
    if (emptiedRegionIds.size === 0) {
        return { ...layout, placements: nextPlacements };
    }
    const nextRegions = layout.regions.filter((r) => !emptiedRegionIds.has(r.id));
    const nextRows = layout.rows
        .map((row) => ({
            ...row,
            regionIds: row.regionIds.filter((id) => !emptiedRegionIds.has(id)),
        }))
        .filter((row) => row.regionIds.length > 0)
        .map((row) => ({ ...row, layoutMode: modeForColumnCount(row.regionIds.length) }));
    const remainingRowIds = new Set(nextRows.map((row) => row.id));
    const nextPages = layout.pages.map((page) => ({
        ...page,
        regionIds: page.regionIds.filter((id) => !emptiedRegionIds.has(id)),
        rowIds: page.rowIds.filter((id) => remainingRowIds.has(id)),
    }));
    return {
        ...layout,
        pages: nextPages,
        rows: nextRows,
        regions: nextRegions,
        placements: nextPlacements,
    };
}

/** 기존 호출부와의 호환을 위한 wrapper — 항상 region 맨 끝에 추가한다. */
export function placeAtomsInOutputRegionById(
    source: OutputLayout,
    atomIds: string[],
    regionId: string
): OutputLayout {
    return insertAtomsIntoOutputRegion(source, atomIds, regionId, null);
}

/**
 * 같은 페이지 안에서 행(row) 자체의 순서를 바꾼다. anchor가 없으면 맨 끝으로 이동.
 * 2/3열 행을 하나의 단위로 위/아래 재정렬할 때 쓴다 — 행 안의 컬럼 구성은 그대로
 * 유지한 채 OutputRow.order만 재번호한다.
 */
export function moveOutputRow(
    source: OutputLayout,
    rowId: string,
    anchor: { rowId: string; position: 'before' | 'after' } | null
): OutputLayout {
    const layout = normalizeOutputLayout(source);
    const movingRow = layout.rows.find((r) => r.id === rowId);
    if (!movingRow) return layout;
    const siblingOrdered = layout.rows
        .filter((r) => r.pageId === movingRow.pageId && r.id !== rowId)
        .sort((a, b) => a.order - b.order);
    let insertIndex = siblingOrdered.length;
    if (anchor) {
        const idx = siblingOrdered.findIndex((r) => r.id === anchor.rowId);
        if (idx >= 0) insertIndex = anchor.position === 'after' ? idx + 1 : idx;
    }
    const nextOrdered = [
        ...siblingOrdered.slice(0, insertIndex),
        movingRow,
        ...siblingOrdered.slice(insertIndex),
    ];
    const orderByRowId = new Map(nextOrdered.map((r, index) => [r.id, index]));
    const nextRows = layout.rows.map((r) => {
        const nextOrder = orderByRowId.get(r.id);
        return nextOrder === undefined || r.pageId !== movingRow.pageId
            ? r
            : { ...r, order: nextOrder };
    });
    return { ...layout, rows: nextRows };
}

/**
 * 2-3열 행(movingRowId)을 단일 열 flow 행 안의 특정 atom 앞/뒤로 옮긴다. anchor가
 * 이미 다른 다열 행 안에 있으면 moveOutputRow/moveSectionRows(행 대 행)로 넘긴다.
 * anchor가 flow 행 안에 있으면 그 flow 행을 anchor 지점에서 둘로 쪼개고 그 사이에
 * 옮겨지는 행을 통째로 끼워넣는다 — replaceOutputPageComposition으로 대상 페이지를
 * 안전하게 재구성한다(직접 rows/regions를 짜맞추지 않음).
 *
 * anchor가 다른 페이지에 있으면(cross-page) 먼저 movingRow를 원래 페이지에서
 * 제거·재번호(moveSectionRows와 같은 방식 — id 재생성 없이)하고, 그 다음 대상
 * 페이지에서 위 split-insert 로직을 수행한다. 이렇게 안 하면 원래 페이지에
 * placements가 빠져나간 빈 row/region 잔해가 남는다(replaceOutputPageComposition은
 * 대상 페이지 하나만 재구성하므로).
 */
export function moveRowNextToAtom(
    source: OutputLayout,
    movingRowId: string,
    anchor: { atomId: string; position: 'before' | 'after' }
): OutputLayout {
    const layout = normalizeOutputLayout(source);
    const movingRow = layout.rows.find((r) => r.id === movingRowId);
    if (!movingRow) return layout;

    const anchorPlacement = layout.placements.find((p) => p.atomId === anchor.atomId);
    const anchorRegion = anchorPlacement
        ? layout.regions.find((r) => r.id === anchorPlacement.regionId)
        : undefined;
    const anchorRow = anchorRegion
        ? layout.rows.find((r) => r.id === anchorRegion.rowId)
        : undefined;
    if (!anchorRow || anchorRow.id === movingRowId) {
        return layout;
    }

    const crossPage = anchorRow.pageId !== movingRow.pageId;

    if (anchorRow.regionIds.length > 1) {
        return crossPage
            ? moveSectionRows(layout, [movingRowId], {
                  rowId: anchorRow.id,
                  position: anchor.position,
              })
            : moveOutputRow(layout, movingRowId, {
                  rowId: anchorRow.id,
                  position: anchor.position,
              });
    }

    const sourcePageIndex = layout.pages.findIndex((p) => p.id === movingRow.pageId);
    if (sourcePageIndex < 0) return layout;
    const { rows: sourceRows } = getOutputPageAt(layout, sourcePageIndex);

    const atomsInRegion = (fromLayout: OutputLayout, regionId: string): string[] =>
        fromLayout.placements
            .filter((p) => p.regionId === regionId)
            .sort((a, b) => a.order - b.order)
            .map((p) => p.atomId);

    const movingRowEntry = sourceRows.find(({ row }) => row.id === movingRowId);
    if (!movingRowEntry) return layout;
    const movingColumns = movingRowEntry.regions.map((region) => atomsInRegion(layout, region.id));

    let workingLayout = layout;
    if (crossPage) {
        const remainingSourceRows = sourceRows
            .filter(({ row }) => row.id !== movingRowId)
            .map(({ row }) => row)
            .sort((a, b) => a.order - b.order);
        const removedRegionIds = new Set(movingRowEntry.regions.map((region) => region.id));
        const nextRows = layout.rows
            .filter((row) => row.id !== movingRowId)
            .map((row) =>
                row.pageId === movingRow.pageId
                    ? { ...row, order: remainingSourceRows.findIndex((r) => r.id === row.id) }
                    : row
            );
        const nextRegions = layout.regions.filter((region) => !removedRegionIds.has(region.id));
        const nextPages = layout.pages.map((page) => {
            if (page.id !== movingRow.pageId) return page;
            const pageRows = nextRows
                .filter((row) => row.pageId === page.id)
                .sort((a, b) => a.order - b.order);
            return {
                ...page,
                rowIds: pageRows.map((row) => row.id),
                regionIds: pageRows.flatMap((row) => row.regionIds),
                layoutMode:
                    pageRows.length === 1 ? pageRows[0].layoutMode : ('SINGLE_COLUMN' as const),
            };
        });
        workingLayout = { ...layout, pages: nextPages, rows: nextRows, regions: nextRegions };
    }

    const targetPageIndex = layout.pages.findIndex((p) => p.id === anchorRow.pageId);
    if (targetPageIndex < 0) return layout;
    const { rows: targetRows } = getOutputPageAt(workingLayout, targetPageIndex);

    const flowRegionId = anchorRow.regionIds[0];
    const flowOrdered = atomsInRegion(workingLayout, flowRegionId);
    const anchorIndex = flowOrdered.indexOf(anchor.atomId);
    if (anchorIndex < 0) return layout;
    const splitIndex = anchor.position === 'after' ? anchorIndex + 1 : anchorIndex;
    const beforeIds = flowOrdered.slice(0, splitIndex);
    const afterIds = flowOrdered.slice(splitIndex);

    const composition: string[][][] = [];
    targetRows.forEach(({ row, regions }) => {
        if (row.id === movingRowId) return;
        if (row.id === anchorRow.id) {
            if (beforeIds.length > 0) composition.push([beforeIds]);
            composition.push(movingColumns);
            if (afterIds.length > 0) composition.push([afterIds]);
            return;
        }
        composition.push(regions.map((region) => atomsInRegion(workingLayout, region.id)));
    });

    return replaceOutputPageComposition(workingLayout, targetPageIndex, composition);
}

/**
 * atom 묶음을 단일 열 flow가 아니라, 특정 행(targetRowId) 바로 앞/뒤에 "새로운
 * 단일 열 행"으로 끼워넣는다 — 다열 행의 좁은 컬럼 안에 욱여넣는 대신, 그 행과
 * 나란한 하나의 행으로 취급한다. moveRowNextToAtom과 마찬가지로
 * replaceOutputPageComposition으로 페이지 전체를 재구성한다.
 */
export function insertAtomsNextToRow(
    source: OutputLayout,
    atomIds: string[],
    targetRowId: string,
    position: 'before' | 'after'
): OutputLayout {
    const layout = normalizeOutputLayout(source);
    const targetRow = layout.rows.find((r) => r.id === targetRowId);
    if (!targetRow || atomIds.length === 0) return layout;
    const pageIndex = layout.pages.findIndex((p) => p.id === targetRow.pageId);
    if (pageIndex < 0) return layout;
    const { rows } = getOutputPageAt(layout, pageIndex);
    const movingSet = new Set(atomIds);

    const atomsInRegion = (regionId: string): string[] =>
        layout.placements
            .filter((p) => p.regionId === regionId && !movingSet.has(p.atomId))
            .sort((a, b) => a.order - b.order)
            .map((p) => p.atomId);

    const composition: string[][][] = [];
    rows.forEach(({ row, regions }) => {
        const columns = regions
            .map((region) => atomsInRegion(region.id))
            .filter((col) => col.length > 0);
        if (row.id === targetRowId) {
            if (position === 'before') composition.push([atomIds]);
            if (columns.length > 0) composition.push(columns);
            if (position === 'after') composition.push([atomIds]);
            return;
        }
        if (columns.length > 0) composition.push(columns);
    });

    return replaceOutputPageComposition(layout, pageIndex, composition);
}

/**
 * insertAtomsNextToRow와 동일하되, 옮겨진 atom들을 pageLocked로 강제 고정한다.
 * 강제 페이지 배치의 anchor가 2열 이상 행 안에 있을 때, 그 좁은 컬럼에 욱여넣는
 * 대신 그 행 옆에 새 한 줄 행으로 끼워넣으면서도 강제배치 상태는 유지하기 위함.
 */
export function forceAtomsNextToRow(
    source: OutputLayout,
    atomIds: string[],
    targetRowId: string,
    position: 'before' | 'after'
): OutputLayout {
    if (atomIds.length === 0) return normalizeOutputLayout(source);
    const moved = insertAtomsNextToRow(source, atomIds, targetRowId, position);
    const atomIdSet = new Set(atomIds);
    return {
        ...moved,
        placements: moved.placements.map((placement) =>
            atomIdSet.has(placement.atomId) ? { ...placement, pageLocked: true } : placement
        ),
    };
}

/**
 * 헤더 atom을 드래그해 섹션 전체(그 헤더 + 소속된 모든 행)를 다른 섹션의 앞/뒤로
 * 통째로 옮긴다. movingRowIds에 속한 각 행은 내부 컬럼 구성(2/3/4열)을 그대로
 * 유지한 채 위치만 옮겨진다. replaceOutputPageComposition은 페이지 하나 안에서만
 * 재구성하므로, 자연 오버플로로 옮기는 행들이 anchor와 다른 페이지에 걸쳐 있는
 * 경우까지 다루기 위해 rows/regions/placements의 pageId를 직접 재배정한다.
 */
export function moveSectionRows(
    source: OutputLayout,
    movingRowIds: string[],
    anchor: { rowId: string; position: 'before' | 'after' }
): OutputLayout {
    const layout = normalizeOutputLayout(source);
    const anchorRow = layout.rows.find((row) => row.id === anchor.rowId);
    if (!anchorRow) return layout;
    const movingRowSet = new Set(movingRowIds.filter((id) => id !== anchor.rowId));
    // row.order는 같은 페이지 안에서만 의미 있다 — 옮기는 섹션이 여러 페이지에
    // 걸쳐 있으면 페이지 인덱스로 먼저 정렬해야 내부 순서가 안 뒤섞인다.
    const pageIndexById = new Map(layout.pages.map((page, index) => [page.id, index]));
    const movingRows = layout.rows
        .filter((row) => movingRowSet.has(row.id))
        .sort((a, b) => {
            const pageA = pageIndexById.get(a.pageId) ?? 0;
            const pageB = pageIndexById.get(b.pageId) ?? 0;
            return pageA !== pageB ? pageA - pageB : a.order - b.order;
        });
    if (movingRows.length === 0) return layout;

    const targetPageId = anchorRow.pageId;
    const sourcePageIds = new Set(movingRows.map((row) => row.pageId));
    const movingRegionIds = new Set(
        layout.regions.filter((region) => movingRowSet.has(region.rowId)).map((region) => region.id)
    );

    const rows = layout.rows.map((row) =>
        movingRowSet.has(row.id) ? { ...row, pageId: targetPageId } : row
    );
    const regions = layout.regions.map((region) =>
        movingRegionIds.has(region.id) ? { ...region, pageId: targetPageId } : region
    );
    const placements = layout.placements.map((placement) =>
        movingRegionIds.has(placement.regionId) ? { ...placement, pageId: targetPageId } : placement
    );

    const targetSiblingRows = rows
        .filter((row) => row.pageId === targetPageId && !movingRowSet.has(row.id))
        .sort((a, b) => a.order - b.order);
    const anchorIndex = targetSiblingRows.findIndex((row) => row.id === anchor.rowId);
    const insertAt =
        anchorIndex < 0
            ? targetSiblingRows.length
            : anchor.position === 'after'
              ? anchorIndex + 1
              : anchorIndex;
    const nextTargetOrder = [
        ...targetSiblingRows.slice(0, insertAt),
        ...movingRows,
        ...targetSiblingRows.slice(insertAt),
    ];
    const targetOrderMap = new Map(nextTargetOrder.map((row, index) => [row.id, index]));

    const sourceOrderMap = new Map<string, number>();
    sourcePageIds.forEach((pageId) => {
        if (pageId === targetPageId) return;
        rows.filter((row) => row.pageId === pageId && !movingRowSet.has(row.id))
            .sort((a, b) => a.order - b.order)
            .forEach((row, index) => sourceOrderMap.set(row.id, index));
    });

    const reNumberedRows = rows.map((row) => {
        if (row.pageId === targetPageId) {
            const order = targetOrderMap.get(row.id);
            return order === undefined ? row : { ...row, order };
        }
        const order = sourceOrderMap.get(row.id);
        return order === undefined ? row : { ...row, order };
    });

    const affectedPageIds = new Set([targetPageId, ...sourcePageIds]);
    const pages = layout.pages.map((page) => {
        if (!affectedPageIds.has(page.id)) return page;
        const pageRows = reNumberedRows
            .filter((row) => row.pageId === page.id)
            .sort((a, b) => a.order - b.order);
        return {
            ...page,
            rowIds: pageRows.map((row) => row.id),
            regionIds: pageRows.flatMap((row) => row.regionIds),
            layoutMode: pageRows.length === 1 ? pageRows[0].layoutMode : ('SINGLE_COLUMN' as const),
        };
    });

    return { ...layout, pages, rows: reNumberedRows, regions, placements };
}

/**
 * 명시적으로 배치된 페이지도 콘텐츠 총 높이가 페이지 최대 높이를 넘으면, 넘치는
 * 뒤쪽 행들을 자동으로 다음 페이지 앞부분으로 밀어낸다(필요하면 새 페이지 생성,
 * 연쇄적으로 다음 페이지도 넘치면 계속 이어서 처리). 자연 흐름 페이지네이터
 * (partitionAtomsIntoPages)는 "아직 한 번도 명시적으로 배치 안 된" atom에만
 * 적용되므로, 드래그로 명시적 배치가 바뀌어 페이지가 꽉 차거나 넘쳐도 저절로는
 * 안 쪼개진다 — 이 함수가 그 빈틈을 메운다.
 *
 * pageLocked가 걸린 행(사용자가 명시적으로 "N페이지로 강제"한 것)은 절대 옮기지
 * 않는다 — 그 행 자체가 넘쳐도 그대로 두고, 그 뒤에 오는 잠기지 않은 행들만
 * 다음 페이지로 넘긴다. "당겨오기"(다음 페이지 내용을 앞으로 끌어와 빈 공간을
 * 채우는 것)는 하지 않는다 — 사용자가 의도적으로 만든 페이지 분할을 건드릴
 * 위험이 커서, 넘치는 것을 뒤로 미는 방향만 다룬다.
 */
export function rebalancePageOverflow(
    source: OutputLayout,
    getAtomHeightPx: (atomId: string) => number,
    maxContentHeightPx: number,
    maxPageCount: number
): OutputLayout {
    // normalizeOutputLayout을 여기서 무조건 부르면 안 바뀌어도 매번 새 참조가
    // 나와서 self-heal의 참조 비교(changed 감지)가 깨지고 무한 루프가 난다(실제
    // 발생 확인됨) — 다른 self-heal 단계(pruneEmptyOutputRows 등)와 동일하게
    // source를 그대로 쓰고, 실제로 옮길 게 있을 때만(ensureOutputLayoutPageCount/
    // moveSectionRows 호출 시) 새 참조가 생기게 한다.
    let layout = source;

    const isRowLocked = (row: OutputRow): boolean => {
        const regionIdSet = new Set(row.regionIds);
        return layout.placements.some((p) => regionIdSet.has(p.regionId) && p.pageLocked);
    };

    const atomsInRegion = (regionId: string): string[] =>
        layout.placements
            .filter((p) => p.regionId === regionId)
            .sort((a, b) => a.order - b.order)
            .map((p) => p.atomId);

    const rowHeightPx = (row: OutputRow): number =>
        Math.max(
            0,
            ...row.regionIds.map((regionId) =>
                atomsInRegion(regionId).reduce((sum, atomId) => sum + getAtomHeightPx(atomId), 0)
            )
        );

    let pageIndex = 0;
    let guard = 0;
    while (pageIndex < layout.pages.length && guard < 200) {
        guard += 1;
        const page = layout.pages[pageIndex];
        const pageRows = layout.rows
            .filter((row) => row.pageId === page.id)
            .sort((a, b) => a.order - b.order);

        let cumulative = 0;
        let overflowStartIndex = -1;
        for (let i = 0; i < pageRows.length; i += 1) {
            const h = rowHeightPx(pageRows[i]);
            if (i > 0 && cumulative + h > maxContentHeightPx) {
                overflowStartIndex = i;
                break;
            }
            cumulative += h;
        }

        if (overflowStartIndex === -1) {
            pageIndex += 1;
            continue;
        }

        if (pageIndex + 1 >= maxPageCount) {
            // 렌더 루프가 자연 흐름 페이지 수(maxPageCount)만큼만 화면에 그리므로,
            // 그 너머로 페이지를 새로 만들면 내용이 화면에 전혀 안 보이는 곳으로
            // 밀려난다. 이 한계에 닿으면 넘치는 걸 그대로 두고(화면에 넘쳐 보이는
            // 채로) 다음 페이지 검사로 넘어간다 — 안 보이게 사라지는 것보다 낫다.
            pageIndex += 1;
            continue;
        }

        const overflowRow = pageRows[overflowStartIndex];
        const remainingBudget = maxContentHeightPx - cumulative;

        // 단일 열 행 하나가 atom을 여러 개 품고 있는 경우가 흔하다
        // (materializePageIntoRows가 아직 안 건드린 자연 순서 구간을 통째로 하나의
        // flow row로 묶어두기 때문). 이럴 때 행 전체를 옮기면 수십 개 atom이 한
        // 덩어리로 다음 페이지로 밀리고, 그 페이지도 곧바로 다시 넘쳐서 페이지 수가
        // 걷잡을 수 없이 늘어난다(실제 발생 확인됨 — 9페이지가 12페이지로). 실제로
        // 안 들어가는 atom부터만 다음 페이지 맨 앞에 새 행으로 쪼갠다.
        if (!isRowLocked(overflowRow) && overflowRow.regionIds.length === 1) {
            const atomIds = atomsInRegion(overflowRow.regionIds[0]);
            if (atomIds.length > 1) {
                let used = 0;
                let splitAt = atomIds.length;
                for (let i = 0; i < atomIds.length; i += 1) {
                    const h = getAtomHeightPx(atomIds[i]);
                    if (i > 0 && used + h > remainingBudget) {
                        splitAt = i;
                        break;
                    }
                    used += h;
                }
                if (splitAt > 0 && splitAt < atomIds.length) {
                    const moveIds = atomIds.slice(splitAt);
                    layout = ensureOutputLayoutPageCount(layout, pageIndex + 2);
                    const targetPage = layout.pages[pageIndex + 1];
                    const targetFirstRow = layout.rows
                        .filter((row) => row.pageId === targetPage.id)
                        .sort((a, b) => a.order - b.order)[0];
                    if (targetFirstRow) {
                        layout = insertAtomsNextToRow(layout, moveIds, targetFirstRow.id, 'before');
                    } else {
                        const { row: newRow, regions: newRegions } = createRow(targetPage.id, 1, 1);
                        const movingSet = new Set(moveIds);
                        const newPlacements: OutputPlacement[] = moveIds.map((atomId, order) => ({
                            atomId,
                            pageId: targetPage.id,
                            regionId: newRegions[0].id,
                            order,
                            columnSpan: 1,
                            rowSpan: 1,
                            pageLocked: false,
                        }));
                        layout = {
                            ...layout,
                            pages: layout.pages.map((p) =>
                                p.id === targetPage.id
                                    ? {
                                          ...p,
                                          rowIds: [newRow.id],
                                          regionIds: newRegions.map((r) => r.id),
                                      }
                                    : p
                            ),
                            rows: [...layout.rows, newRow],
                            regions: [...layout.regions, ...newRegions],
                            placements: [
                                ...layout.placements.filter((p) => !movingSet.has(p.atomId)),
                                ...newPlacements,
                            ],
                        };
                    }
                    // pageIndex는 그대로 유지해 같은 페이지를 다시 검사한다.
                    continue;
                }
            }
        }

        const rowsToMove = pageRows.slice(overflowStartIndex).filter((row) => !isRowLocked(row));
        if (rowsToMove.length === 0) {
            // 넘치는 나머지가 전부 잠긴 행 — 옮길 게 없으니 다음 페이지로 넘어간다.
            pageIndex += 1;
            continue;
        }

        layout = ensureOutputLayoutPageCount(layout, pageIndex + 2);
        const targetPage = layout.pages[pageIndex + 1];
        const targetFirstRow = layout.rows
            .filter((row) => row.pageId === targetPage.id)
            .sort((a, b) => a.order - b.order)[0];

        if (targetFirstRow) {
            layout = moveSectionRows(
                layout,
                rowsToMove.map((row) => row.id),
                { rowId: targetFirstRow.id, position: 'before' }
            );
        } else {
            // 대상 페이지에 row가 하나도 없음(전부 pruning된 경우) — anchor 없이
            // 직접 pageId/order를 재할당한다.
            const movingIdSet = new Set(rowsToMove.map((row) => row.id));
            const movingRegionIds = new Set(
                layout.regions
                    .filter((region) => movingIdSet.has(region.rowId))
                    .map((region) => region.id)
            );
            const orderByRowId = new Map(rowsToMove.map((row, index) => [row.id, index]));
            const rows = layout.rows.map((row) =>
                movingIdSet.has(row.id)
                    ? { ...row, pageId: targetPage.id, order: orderByRowId.get(row.id)! }
                    : row
            );
            const regions = layout.regions.map((region) =>
                movingRegionIds.has(region.id) ? { ...region, pageId: targetPage.id } : region
            );
            const placements = layout.placements.map((placement) =>
                movingRegionIds.has(placement.regionId)
                    ? { ...placement, pageId: targetPage.id }
                    : placement
            );
            const movedRows = rowsToMove.map((row) => ({ ...row, pageId: targetPage.id }));
            const pages = layout.pages.map((p) =>
                p.id === targetPage.id
                    ? {
                          ...p,
                          rowIds: movedRows.map((row) => row.id),
                          regionIds: movedRows.flatMap((row) => row.regionIds),
                          layoutMode:
                              movedRows.length === 1
                                  ? movedRows[0].layoutMode
                                  : ('SINGLE_COLUMN' as const),
                      }
                    : p
            );
            layout = { ...layout, pages, rows, regions, placements };
        }
        // pageIndex는 그대로 유지해 같은 페이지를 다시 검사한다(옮기고 남은 잠긴
        // 행들이 여전히 넘칠 수 있음) — guard가 무한 루프만 막는다. 다음 페이지가
        // 이번에 받은 콘텐츠로 인해 또 넘치는 건 pageIndex가 거기 도달했을 때
        // 자연스럽게 다시 검사된다.
    }

    return pruneEmptyOutputRows(layout);
}

/**
 * 한 atom 묶음을 페이지 region에 배치한다. region 좌표는 보존하되 명시적인 pageLocked만
 * 강제 페이지 projection으로 내보내므로, 좌우 열 배치가 강제 페이지 배지로 오인되지 않는다.
 */
export function placeAtomsInOutputRegion(
    source: OutputLayout,
    atomIds: string[],
    pageIndex: number,
    regionKind: OutputRegionKind
): OutputLayout {
    const requestedMode: OutputLayoutMode = regionKind === 'FLOW' ? 'SINGLE_COLUMN' : 'TWO_COLUMN';
    const layout = setOutputPageLayoutMode(source, pageIndex, requestedMode);
    const page = layout.pages[Math.max(0, pageIndex)] ?? layout.pages[0];
    const region = layout.regions.find(
        (item) => item.pageId === page.id && item.kind === regionKind
    );
    return region ? placeAtomsInOutputRegionById(layout, atomIds, region.id) : layout;
}

export function getOutputPageAt(
    source: OutputLayout,
    pageIndex: number
): {
    page: OutputPage;
    rows: Array<{ row: OutputRow; regions: OutputRegion[] }>;
    regions: OutputRegion[];
} {
    const layout = ensureOutputLayoutPageCount(source, Math.max(0, pageIndex) + 1);
    const page = layout.pages[Math.max(0, pageIndex)] ?? layout.pages[0];
    const regionIds = new Set(page.regionIds);
    const regions = layout.regions
        .filter((region) => regionIds.has(region.id))
        .sort((left, right) => left.order - right.order);
    return {
        page,
        rows: layout.rows
            .filter((row) => row.pageId === page.id)
            .sort((left, right) => left.order - right.order)
            .map((row) => ({
                row,
                regions: regions
                    .filter((region) => region.rowId === row.id)
                    .sort((left, right) => left.order - right.order),
            })),
        regions,
    };
}

/** 현재 1차원 paginator가 새 모델을 읽을 수 있도록 제공하는 호환 projection. */
export function outputLayoutToForcedPageOverrides(source: OutputLayout): Record<string, number> {
    const layout = normalizeOutputLayout(source);
    const pageIndexById = new Map(layout.pages.map((page, index) => [page.id, index]));
    return Object.fromEntries(
        layout.placements.flatMap((placement) => {
            if (!placement.pageLocked) return [];
            const pageIndex = pageIndexById.get(placement.pageId);
            return pageIndex === undefined ? [] : [[placement.atomId, pageIndex]];
        })
    );
}
