import type { ReactNode } from 'react';

export type TocItem = {
    id: string;
    text: string;
    level: number;
};

export function getNodeText(node: ReactNode): string {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }
    if (Array.isArray(node)) {
        return node.map(getNodeText).join('');
    }
    if (
        typeof node === 'object' &&
        'props' in node &&
        (node as { props: { children?: ReactNode } }).props.children
    ) {
        return getNodeText((node as { props: { children?: ReactNode } }).props.children);
    }
    return '';
}

export function slugifyHeading(text: string): string {
    const clean = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .trim();
    const slug = clean
        .toLowerCase()
        .replace(/[^\w\uac00-\ud7a30-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || 'heading';
}

export function extractToc(markdown: string): TocItem[] {
    if (!markdown) return [];
    const lines = markdown.split('\n');
    const toc: TocItem[] = [];
    let inCodeBlock = false;
    const slugCounts = new Map<string, number>();

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            continue;
        }
        if (inCodeBlock) continue;

        const match = trimmed.match(/^(#{1,3})\s+(.+)$/);
        if (match) {
            const level = match[1].length;
            const rawText = match[2].trim();
            const cleanText = rawText
                .replace(/\*\*(.*?)\*\*/g, '$1')
                .replace(/`(.*?)`/g, '$1')
                .replace(/\[(.*?)\]\(.*?\)/g, '$1')
                .trim();

            if (!cleanText) continue;

            const baseSlug = slugifyHeading(cleanText);
            const count = slugCounts.get(baseSlug) || 0;
            const slug = count > 0 ? `${baseSlug}-${count}` : baseSlug;
            slugCounts.set(baseSlug, count + 1);

            toc.push({
                id: slug,
                text: cleanText,
                level,
            });
        }
    }
    return toc;
}
