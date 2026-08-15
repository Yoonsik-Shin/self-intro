import type { PageOrientation } from '@/lib/pdfLayoutEngine';

export const OUTPUT_LAYOUT_SCHEMA_VERSION = 3;

export type OutputLayoutMode = 'SINGLE_COLUMN' | 'TWO_COLUMN' | 'THREE_COLUMN';
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
    if (mode === 'THREE_COLUMN') return 3;
    if (mode === 'TWO_COLUMN') return 2;
    return 1;
}

function modeForColumnCount(count: number): OutputLayoutMode {
    if (count >= 3) return 'THREE_COLUMN';
    if (count === 2) return 'TWO_COLUMN';
    return 'SINGLE_COLUMN';
}

function createRow(
    pageId: string,
    rowNumber: number,
    columnCount = 1
): { row: OutputRow; regions: OutputRegion[] } {
    const rowId = `${pageId}-row-${rowNumber}`;
    const normalizedCount = clamp(Math.round(columnCount), 1, 3);
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
                page.layoutMode === 'THREE_COLUMN'
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

export function forceAtomsToPage(
    source: OutputLayout,
    atomIds: string[],
    pageIndex: number
): OutputLayout {
    const layout = ensureOutputLayoutPageCount(source, pageIndex + 1);
    const page = layout.pages[Math.max(0, pageIndex)] ?? layout.pages[0];
    const regionId = page.regionIds[0];
    const atomIdSet = new Set(atomIds);
    const preserved = layout.placements.filter((item) => !atomIdSet.has(item.atomId));
    const nextOrder = Math.max(-1, ...preserved.map((item) => item.order)) + 1;
    const added = atomIds.map((atomId, index): OutputPlacement => ({
        atomId,
        pageId: page.id,
        regionId,
        order: nextOrder + index,
        columnSpan: 1,
        rowSpan: 1,
        pageLocked: true,
    }));
    return { ...layout, placements: [...preserved, ...added] };
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
                .slice(0, 3)
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
    const placements = layout.placements.map((placement) =>
        oldRegionIds.has(placement.regionId)
            ? { ...placement, regionId: fallbackRegionId }
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

export function removeOutputRow(source: OutputLayout, rowId: string): OutputLayout {
    const layout = normalizeOutputLayout(source);
    const target = layout.rows.find((row) => row.id === rowId);
    if (!target) return layout;
    const pageRows = layout.rows
        .filter((row) => row.pageId === target.pageId)
        .sort((left, right) => left.order - right.order);
    if (pageRows.length <= 1) return layout;
    const remainingRows = pageRows.filter((row) => row.id !== rowId);
    const fallbackRegionId = remainingRows[0].regionIds[0];
    const removedRegionIds = new Set(target.regionIds);
    const rows = layout.rows
        .filter((row) => row.id !== rowId)
        .map((row) =>
            row.pageId === target.pageId
                ? { ...row, order: remainingRows.findIndex((item) => item.id === row.id) }
                : row
        );
    const regions = layout.regions.filter((region) => !removedRegionIds.has(region.id));
    const placements = layout.placements.map((placement) =>
        removedRegionIds.has(placement.regionId)
            ? { ...placement, regionId: fallbackRegionId }
            : placement
    );
    const pages = layout.pages.map((page) =>
        page.id === target.pageId
            ? {
                  ...page,
                  layoutMode:
                      remainingRows.length === 1 ? remainingRows[0].layoutMode : 'SINGLE_COLUMN',
                  rowIds: remainingRows.map((row) => row.id),
                  regionIds: remainingRows.flatMap((row) => row.regionIds),
              }
            : page
    );
    return { ...layout, pages, rows, regions, placements };
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

export function placeAtomsInOutputRegionById(
    source: OutputLayout,
    atomIds: string[],
    regionId: string
): OutputLayout {
    const layout = normalizeOutputLayout(source);
    const region = layout.regions.find((item) => item.id === regionId);
    if (!region || atomIds.length === 0) return layout;
    const atomIdSet = new Set(atomIds);
    const previousPlacementByAtomId = new Map(
        layout.placements.map((placement) => [placement.atomId, placement])
    );
    const preserved = layout.placements.filter((item) => !atomIdSet.has(item.atomId));
    const nextOrder =
        Math.max(
            -1,
            ...preserved.filter((item) => item.regionId === region.id).map((item) => item.order)
        ) + 1;
    const added = atomIds.map((atomId, index): OutputPlacement => ({
        atomId,
        pageId: region.pageId,
        regionId: region.id,
        order: nextOrder + index,
        columnSpan: 1,
        rowSpan: 1,
        pageLocked: previousPlacementByAtomId.get(atomId)?.pageLocked === true,
    }));
    return { ...layout, placements: [...preserved, ...added] };
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
