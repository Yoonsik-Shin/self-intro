/**
 * 브라우저 localStorage에 PDF 인쇄 설정을 저장/불러오기/삭제/이름 변경하는 유틸.
 * 서버 DB 템플릿과 별개로, 사용자가 "직접 조정" 모드에서 간편 저장할 때 사용한다.
 */

export type LocalPrintSave = {
  id: string;
  memo: string;
  excludedIds: string[];
  sectionOrder: string[];
  sectionGaps: Record<string, number>;
  forcedPageOverrides?: Record<string, number>;
  savedAt: string; // ISO timestamp
};

const STORAGE_KEY = 'print-template-locals';

export function getLocalSaves(): LocalPrintSave[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalPrintSave[]) : [];
  } catch {
    return [];
  }
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

  if (duplicateIndex !== -1) {
    // 동일한 이름이 있으면 해당 항목 덮어쓰기
    const updatedEntry: LocalPrintSave = {
      ...existing[duplicateIndex],
      ...save,
      savedAt: new Date().toISOString(),
    };
    existing.splice(duplicateIndex, 1);
    existing.unshift(updatedEntry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return updatedEntry;
  }

  // 새로 생성
  const entry: LocalPrintSave = {
    ...save,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };
  existing.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return entry;
}

export function renameLocal(id: string, newMemo: string): boolean {
  const existing = getLocalSaves();
  const target = existing.find((s) => s.id === id);
  if (!target) return false;

  target.memo = newMemo.trim();
  target.savedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return true;
}

export function removeLocal(id: string): void {
  const existing = getLocalSaves().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}
