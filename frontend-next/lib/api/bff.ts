import { request } from './client';
import type { IntroductionResponse, LearningResponse } from './types';

export const bffApi = {
    getIntroduction: () => request<IntroductionResponse>('/api/bff/introduction'),
    getLearning: () => request<LearningResponse>('/api/bff/learning'),
};
