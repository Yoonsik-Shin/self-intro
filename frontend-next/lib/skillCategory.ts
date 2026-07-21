import type { Skill } from './api/types';

export function getDisplayCategory(skill: Skill): string {
    const nameLower = skill.name.toLowerCase();
    if (
        nameLower.includes('react') ||
        nameLower.includes('vue') ||
        nameLower.includes('svelte') ||
        nameLower.includes('html') ||
        nameLower.includes('css')
    ) {
        return 'Frontend';
    }
    if (skill.category === 'LANGUAGE' || skill.category === 'FRAMEWORK') {
        return 'Backend & Language';
    }
    if (skill.category === 'DATABASE') {
        return 'Database';
    }
    if (skill.category === 'DEVOPS') {
        return 'DevOps & Infra';
    }
    if (skill.category === 'AI_RAG') {
        return 'AI / RAG';
    }
    return 'Others';
}
