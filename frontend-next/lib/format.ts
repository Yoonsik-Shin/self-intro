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
    return exp.companyName ?? exp.institutionName ?? exp.issuer ?? '';
}

export function credentialKindLabel(experience: Experience): '학력' | '교육' | '자격증' {
    if (experience.type === 'CERTIFICATE') return '자격증';
    if (experience.educationType === 'ACADEMIC') return '학력';
    if (experience.educationType === 'COURSE') return '교육';
    // Fallback: 학위 표현 또는 고등학교 표현으로 정규 학력 구분
    return /(학사|석사|박사|학위|졸업|고등학교|대학교)/.test(experience.title) ? '학력' : '교육';
}

export function graduationStatusLabel(status?: string): string {
    if (!status) return '';
    switch (status.toUpperCase()) {
        case 'GRADUATED':
        case '졸업':
            return '졸업';
        case 'ATTENDING':
        case '재학':
            return '재학';
        case 'COMPLETED':
        case '수료':
            return '수료';
        case 'DROPPED_OUT':
        case '중퇴':
            return '중퇴';
        case 'ON_LEAVE':
        case '휴학':
            return '휴학';
        default:
            return status;
    }
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

export function formatDuration(minutes?: number) {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours === 0) return `${rest}분`;
    if (rest === 0) return `${hours}시간`;
    return `${hours}시간 ${rest}분`;
}
