export type JobplanetClipboardImport = {
    companyName: string;
    rating: number | null;
    reviewCount: number | null;
    companyUrl: string | null;
    found: Array<'companyName' | 'rating' | 'reviewCount' | 'companyUrl'>;
};

const JOBPLANET_URL_PATTERN = /https:\/\/(?:[a-z0-9-]+\.)?jobplanet\.co\.kr\/[^\s<>"']+/i;

function firstNumber(text: string, patterns: RegExp[]): number | null {
    for (const pattern of patterns) {
        const match = pattern.exec(text);
        if (!match) continue;
        const value = Number(match[1].replaceAll(',', ''));
        if (Number.isFinite(value)) return value;
    }
    return null;
}

export function parseJobplanetClipboard(
    rawText: string,
    fallbackCompanyName: string
): JobplanetClipboardImport {
    const text = rawText.replaceAll('\u00a0', ' ').trim();
    const found: JobplanetClipboardImport['found'] = [];

    const urlMatch = text.match(JOBPLANET_URL_PATTERN);
    const companyUrl = urlMatch?.[0].replace(/[),.;]+$/, '') ?? null;
    if (companyUrl) found.push('companyUrl');

    const rating = firstNumber(text, [
        /(?:전체\s*)?평점\s*[:：]?\s*([0-5](?:\.\d{1,2})?)/i,
        /(?:총점|기업\s*평점)\s*[:：]?\s*([0-5](?:\.\d{1,2})?)/i,
    ]);
    const validRating = rating !== null && rating >= 0 && rating <= 5 ? rating : null;
    if (validRating !== null) found.push('rating');

    const reviewCount = firstNumber(text, [
        /([\d,]+)\s*개의?\s*(?:기업\s*)?리뷰/i,
        /([\d,]+)\s*기업리뷰/i,
        /기업리뷰\s*[:：]?\s*([\d,]+)/i,
        /리뷰\s*[:：]\s*([\d,]+)\s*개?/i,
    ]);
    if (reviewCount !== null) found.push('reviewCount');

    const labeledCompany = text.match(/(?:기업명|회사명)\s*[:：]\s*([^\n|]{2,100})/i)?.[1]?.trim();
    const companyName = labeledCompany || fallbackCompanyName.trim();
    if (labeledCompany) found.push('companyName');

    return {
        companyName,
        rating: validRating,
        reviewCount,
        companyUrl,
        found,
    };
}
