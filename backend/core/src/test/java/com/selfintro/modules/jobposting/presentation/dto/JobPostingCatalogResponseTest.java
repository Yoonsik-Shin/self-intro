package com.selfintro.modules.jobposting.presentation.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class JobPostingCatalogResponseTest {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void workspaceCatalogSerializesOnlyDiscoveryMetadataAndOriginalLink() throws Exception {
        JobPostingCatalogResponse response =
                new JobPostingCatalogResponse(
                        1L,
                        "테스트 회사",
                        "백엔드 개발자",
                        "https://example.com/jobs/1",
                        "원본 채용 사이트",
                        LocalDate.of(2026, 8, 31),
                        false,
                        "서울",
                        "정규직",
                        false);

        String json = objectMapper.writeValueAsString(response);

        assertThat(json)
                .contains("postingUrl", "deadline", "source", "companyName", "positionTitle")
                .doesNotContain(
                        "jobDescription",
                        "requiredQualifications",
                        "preferredQualifications",
                        "collectionMethod",
                        "externalId");
    }
}
