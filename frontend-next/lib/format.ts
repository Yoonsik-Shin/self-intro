import type { Experience } from './api/types';

export function experienceTypeLabel(type: Experience['type']): string {
    switch (type) {
        case 'CAREER':
            return '경력';
        case 'PROJECT':
            return '프로젝트';
        case 'EDUCATION':
            return '학력·교육';
        case 'CERTIFICATE':
            return '자격증';
        default:
            return type;
    }
}

export function experienceOrgName(exp: Experience): string {
    return exp.companyName ?? exp.institutionName ?? exp.issuer ?? exp.role ?? '';
}

export function credentialKindLabel(experience: Experience): '학력' | '교육' | '자격증' {
    if (experience.type === 'CERTIFICATE') return '자격증';
    // 현재 EDUCATION 데이터에는 별도 하위 유형이 없어 학위 표현으로 정규 학력을 구분한다.
    return /(학사|석사|박사|학위|졸업)/.test(experience.title) ? '학력' : '교육';
}

export function formatShortPeriod(start: string, end?: string) {
    const format = (dateStr: string) => dateStr.replace(/-/g, '.').substring(0, 7);
    return `${format(start)} - ${end ? format(end) : '진행 중'}`;
}

function formatCredentialDate(date: string) {
    return date.replace(/-/g, '.');
}

export function formatCredentialPeriod(experience: Experience) {
    const start = formatCredentialDate(experience.periodStart);
    if (!experience.periodEnd || experience.periodEnd === experience.periodStart) {
        return start;
    }
    return `${start} - ${formatCredentialDate(experience.periodEnd)}`;
}
