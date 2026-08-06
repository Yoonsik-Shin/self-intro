package com.selfintro.jobposting.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class JobPostingPrintDraftServiceTest {

    private final JobPostingPrintDraftService service =
            new JobPostingPrintDraftService(
                    null, null, null, null, null, null, null, null, new ObjectMapper());

    @Test
    void parsesJsonEvenWhenModelAddsTextAroundIt() {
        JsonNode result =
                service.parseJson(
                        "분석 결과입니다.\n```json\n{\"strategySummary\":\"핵심 경력 우선\"}\n```\n확인해 주세요.");

        assertThat(result.path("strategySummary").asText()).isEqualTo("핵심 경력 우선");
        assertThat(result.path("_fallbackUsed").asBoolean()).isFalse();
    }

    @Test
    void fallsBackToSafePlanWhenModelResponseIsTruncated() {
        JsonNode result = service.parseJson("{\"strategySummary\":\"잘린 응답");

        assertThat(result.path("_fallbackUsed").asBoolean()).isTrue();
        assertThat(result.path("warnings").isArray()).isTrue();
        assertThat(result.path("warnings")).isNotEmpty();
    }
}
