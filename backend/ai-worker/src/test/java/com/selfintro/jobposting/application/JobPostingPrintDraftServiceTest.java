package com.selfintro.jobposting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobApplicationRepository;
import jakarta.persistence.EntityNotFoundException;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class JobPostingPrintDraftServiceTest {

    private final JobPostingPrintDraftService service =
            new JobPostingPrintDraftService(
                    null, null, null, null, null, null, null, null, null, null, new ObjectMapper());

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

    @Test
    void rejectsPostingThatDoesNotBelongToWorkspaceBeforeBuildingDraft() {
        WorkspaceJobApplicationRepository applications =
                mock(WorkspaceJobApplicationRepository.class);
        when(applications.findByWorkspaceIdAndJobPostingId(20L, 100L)).thenReturn(Optional.empty());
        JobPostingPrintDraftService isolatedService =
                new JobPostingPrintDraftService(
                        applications,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        new ObjectMapper());

        assertThatThrownBy(() -> isolatedService.generate(20L, 100L, null, null))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("Workspace 지원 건");
    }
}
