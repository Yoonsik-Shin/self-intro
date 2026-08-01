import { useSyncExternalStore } from 'react';

export type LocalPrintSave = {
    id: string;
    memo: string;
    excludedIds: string[];
    sectionOrder: string[];
    sectionGaps: Record<string, number>;
    forcedPageOverrides?: Record<string, number>;
    itemOrderOverrides?: Record<string, string[]>;
    baseContentFingerprint?: string;
    savedAt: string; // ISO timestamp
};

const STORAGE_KEY = 'print-template-locals';
const LOCAL_SAVES_CHANGED_EVENT = 'print-template-locals-changed';

const EMPTY_LOCAL_SAVES: LocalPrintSave[] = [];
let cachedRaw: string | null = null;
let cachedParsed: LocalPrintSave[] = EMPTY_LOCAL_SAVES;

function notifyChange() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(LOCAL_SAVES_CHANGED_EVENT));
    }
}

export function getLocalSaves(): LocalPrintSave[] {
    if (typeof window === 'undefined') return EMPTY_LOCAL_SAVES;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === cachedRaw) return cachedParsed;
        cachedRaw = raw;
        const parsed = raw ? (JSON.parse(raw) as LocalPrintSave[]) : EMPTY_LOCAL_SAVES;
        cachedParsed = Array.isArray(parsed) ? parsed : EMPTY_LOCAL_SAVES;
        return cachedParsed;
    } catch {
        cachedParsed = EMPTY_LOCAL_SAVES;
        return cachedParsed;
    }
}

function getLocalSavesServerSnapshot(): LocalPrintSave[] {
    return EMPTY_LOCAL_SAVES;
}

function subscribeLocalSaves(onStoreChange: () => void) {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('storage', onStoreChange);
    window.addEventListener(LOCAL_SAVES_CHANGED_EVENT, onStoreChange);
    return () => {
        window.removeEventListener('storage', onStoreChange);
        window.removeEventListener(LOCAL_SAVES_CHANGED_EVENT, onStoreChange);
    };
}

export function useLocalPrintSaves(): LocalPrintSave[] {
    return useSyncExternalStore(subscribeLocalSaves, getLocalSaves, getLocalSavesServerSnapshot);
}

/** 중복되지 않는 고유한 기본 이름 생성 (e.g., '내 맞춤 인쇄 설정 2') */
export function generateUniqueLocalName(baseName: string = '내 맞춤 인쇄 설정'): string {
    const existingNames = new Set(getLocalSaves().map((s) => s.memo.trim()));
    if (!existingNames.has(baseName)) return baseName;

    let count = 2;
    while (existingNames.has(`${baseName} ${count}`)) {
        count++;
    }
    return `${baseName} ${count}`;
}

export function saveLocal(save: Omit<LocalPrintSave, 'id' | 'savedAt'>): LocalPrintSave {
    const existing = getLocalSaves();
    const duplicateIndex = existing.findIndex((s) => s.memo.trim() === save.memo.trim());

    let entry: LocalPrintSave;
    if (duplicateIndex !== -1) {
        // 동일한 이름이 있으면 해당 항목 덮어쓰기
        entry = {
            ...existing[duplicateIndex],
            ...save,
            savedAt: new Date().toISOString(),
        };
        const next = [...existing];
        next.splice(duplicateIndex, 1);
        next.unshift(entry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
        // 새로 생성
        entry = {
            ...save,
            id: crypto.randomUUID(),
            savedAt: new Date().toISOString(),
        };
        const next = [entry, ...existing];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    notifyChange();
    return entry;
}

export function renameLocal(id: string, newMemo: string): boolean {
    const existing = getLocalSaves();
    const target = existing.find((s) => s.id === id);
    if (!target) return false;

    const next = existing.map((s) =>
        s.id === id ? { ...s, memo: newMemo.trim(), savedAt: new Date().toISOString() } : s
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    notifyChange();
    return true;
}

export function removeLocal(id: string): void {
    const existing = getLocalSaves().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    notifyChange();
}
