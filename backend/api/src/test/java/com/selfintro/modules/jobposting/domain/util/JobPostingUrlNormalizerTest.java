package com.selfintro.modules.jobposting.domain.util;

import static org.assertj.core.api.Assertions.assertThat;

import com.selfintro.modules.jobposting.domain.enums.JobPostingPlatform;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class JobPostingUrlNormalizerTest {

    @Test
    @DisplayName("사람인 relay view 및 view URL을 rec_idx 기준 표준 URL로 통일한다")
    void normalizesSaraminUrlsToCanonicalForm() {
        String mailUrl =
                "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=54566467&utm_source=person_clone_scrap_close&utm_medium=mail&utm_campaign=20260805&utm_term=recruit&rf=mail#seq=0";
        String listUrl =
                "https://www.saramin.co.kr/zf_user/jobs/relay/view?view_type=list&rec_idx=54566467#seq=0";

        String expected = "https://www.saramin.co.kr/zf_user/jobs/view?rec_idx=54566467";

        assertThat(JobPostingUrlNormalizer.normalizeUrl(mailUrl)).isEqualTo(expected);
        assertThat(JobPostingUrlNormalizer.normalizeUrl(listUrl)).isEqualTo(expected);
    }

    @Test
    @DisplayName("잡코리아 및 원티드 URL을 canonical 형태로 변환한다")
    void normalizesJobkoreaAndWantedUrls() {
        String jobkoreaUrl =
                "https://www.jobkorea.co.kr/Recruit/GI_Read/49653580?Oem_Code=C1&sc=9#seq=0";
        String wantedUrl = "https://www.wanted.co.kr/wd/123456?utm_source=share";

        assertThat(JobPostingUrlNormalizer.normalizeUrl(jobkoreaUrl))
                .isEqualTo("https://www.jobkorea.co.kr/Recruit/GI_Read/49653580");
        assertThat(JobPostingUrlNormalizer.normalizeUrl(wantedUrl))
                .isEqualTo("https://www.wanted.co.kr/wd/123456");
    }

    @Test
    @DisplayName("복잡한 추적 파라미터가 포함된 URL도 JobPostingPlatform에서 SARAMIN으로 정확히 분류된다")
    void extractsPlatformCorrectlyFromComplexUrl() {
        String mailUrl =
                "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=54566467&utm_source=person_clone_scrap_close&utm_medium=mail&utm_campaign=20260805&utm_term=recruit&rf=mail#seq=0";

        assertThat(JobPostingPlatform.fromUrl(mailUrl)).isEqualTo(JobPostingPlatform.SARAMIN);
    }
}
