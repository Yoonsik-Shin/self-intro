'use client';

// 인쇄 화면에서 사용자가 업로드한 폰트 파일을 브라우저 IndexedDB에 저장해, 새로고침
// 후에도 다시 업로드하지 않고 쓸 수 있게 한다. 서버/워크스페이스 계정에 저장하는 게
// 아니라 "이 브라우저"에만 남는다 — 다른 기기·브라우저에서는 다시 업로드해야 한다.
//
// TODO(print-fonts): 지금은 브라우저 로컬(IndexedDB) 저장뿐이다. 워크스페이스
// 계정 단위 서버 저장으로 확장하는 방향은 docs/print-custom-font-server-storage-todo.md 참고.

const DB_NAME = 'print-custom-fonts';
const STORE_NAME = 'fonts';
const DB_VERSION = 1;

type StoredCustomFont = {
    name: string;
    fileName: string;
    buffer: ArrayBuffer;
    savedAt: number;
};

export type CustomFontMeta = {
    name: string;
    fileName: string;
    savedAt: number;
};

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'name' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllStoredFonts(): Promise<StoredCustomFont[]> {
    const db = await openDb();
    try {
        return await new Promise<StoredCustomFont[]>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const request = tx.objectStore(STORE_NAME).getAll();
            request.onsuccess = () => resolve(request.result as StoredCustomFont[]);
            request.onerror = () => reject(request.error);
        });
    } finally {
        db.close();
    }
}

export async function saveCustomFont(
    name: string,
    fileName: string,
    buffer: ArrayBuffer
): Promise<void> {
    const db = await openDb();
    try {
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put({
                name,
                fileName,
                buffer,
                savedAt: Date.now(),
            } satisfies StoredCustomFont);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } finally {
        db.close();
    }
}

export async function listCustomFonts(): Promise<CustomFontMeta[]> {
    const fonts = await getAllStoredFonts();
    return fonts
        .map(({ name, fileName, savedAt }) => ({ name, fileName, savedAt }))
        .sort((a, b) => b.savedAt - a.savedAt);
}

export async function removeCustomFont(name: string): Promise<void> {
    const db = await openDb();
    try {
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(name);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } finally {
        db.close();
    }
}

/** 저장된 폰트를 전부 document.fonts에 등록한다(이미 등록된 이름은 건너뜀).
 *  손상되거나 IndexedDB를 못 쓰는 환경에서는 조용히 무시한다 — 폰트 톤은
 *  선택 사항이라 실패해도 문서 렌더 자체를 막을 이유가 없다. */
export async function loadAllCustomFontsIntoDocument(): Promise<void> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return;
    try {
        const fonts = await getAllStoredFonts();
        await Promise.all(
            fonts.map(async ({ name, buffer }) => {
                if (document.fonts.check(`12px "${name}"`)) return;
                try {
                    const fontFace = new FontFace(name, buffer);
                    await fontFace.load();
                    document.fonts.add(fontFace);
                } catch {
                    // 손상된 저장 항목 — 건너뛴다.
                }
            })
        );
    } catch {
        // IndexedDB 사용 불가 — 조용히 무시.
    }
}
