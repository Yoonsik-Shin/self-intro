package com.selfintro.modules.jobapplication.domain.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class JobPostingNormalizerTest {

    @Test
    void stripsCorporateSuffixesRegardlessOfPosition() {
        assertThat(JobPostingNormalizer.normalizeCompanyName("(주)토스"))
                .isEqualTo(JobPostingNormalizer.normalizeCompanyName("토스(주)"));
        assertThat(JobPostingNormalizer.normalizeCompanyName("주식회사 토스"))
                .isEqualTo(JobPostingNormalizer.normalizeCompanyName("토스"));
        assertThat(JobPostingNormalizer.normalizeCompanyName("㈜토스"))
                .isEqualTo(JobPostingNormalizer.normalizeCompanyName("토스"));
    }

    @Test
    void ignoresWhitespaceAndCaseDifferencesInCompanyName() {
        assertThat(JobPostingNormalizer.normalizeCompanyName("Naver  Cloud"))
                .isEqualTo(JobPostingNormalizer.normalizeCompanyName("naver cloud"));
    }

    @Test
    void ignoresWhitespaceAndCaseDifferencesInPositionTitle() {
        assertThat(JobPostingNormalizer.normalizePositionTitle("Backend  Engineer"))
                .isEqualTo(JobPostingNormalizer.normalizePositionTitle("backend engineer"));
    }

    @Test
    void doesNotStripKeywordsFromPositionTitle() {
        assertThat(JobPostingNormalizer.normalizePositionTitle("백엔드 개발자(신입)"))
                .isNotEqualTo(JobPostingNormalizer.normalizePositionTitle("백엔드 개발자"));
    }

    @Test
    void treatsNullAsEmptyString() {
        assertThat(JobPostingNormalizer.normalizeCompanyName(null)).isEqualTo("");
        assertThat(JobPostingNormalizer.normalizePositionTitle(null)).isEqualTo("");
    }
}
