package com.selfintro.jobposting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobApplicationRepository;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
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

    @Test
    void preservesPinnedPortfolioSectionAndOnlyAppliesGroundedItemChanges() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode current =
                mapper.readTree(
                        """
                        {"customSections":[{"id":"portfolio-revision-10","title":"결제 개선",\
                        "source":{"type":"PORTFOLIO_CASE_STUDY_REVISION","caseStudyId":3,"revisionId":10,"revisionVersion":2},\
                        "items":[{"id":"problem","title":"문제","content":"결제 지연을 분석했습니다."}]}]}
                        """);
        JsonNode candidates =
                mapper.readTree(
                        """
                        [{"id":"portfolio-revision-10","title":"결제 흐름 개선",\
                        "items":[{"id":"problem","title":"병목 분석","content":"결제 지연 999건을 해결했습니다."}]},\
                        {"id":"invented","title":"새 섹션","items":[]}]
                        """);
        ObjectNode target = mapper.createObjectNode();

        service.mergeCustomSections(target, current, candidates);

        JsonNode section = target.path("customSections").get(0);
        assertThat(target.path("customSections")).hasSize(1);
        assertThat(section.path("title").asText()).isEqualTo("결제 흐름 개선");
        assertThat(section.path("source").path("revisionId").asLong()).isEqualTo(10L);
        assertThat(section.path("items").get(0).path("title").asText()).isEqualTo("병목 분석");
        assertThat(section.path("items").get(0).path("content").asText())
                .isEqualTo("결제 지연을 분석했습니다.");
    }

    @Test
    void keepsCustomSectionExclusionsDuringAiRevision() throws Exception {
        JsonNode currentExcluded =
                new ObjectMapper()
                        .readTree(
                                "[\"project:1\",\"custom-section:portfolio-revision-10\",\"custom-section-item:portfolio-revision-10:problem\"]");

        List<String> merged =
                service.preserveCustomSectionExclusions(List.of("project:2"), currentExcluded);

        assertThat(merged)
                .containsExactly(
                        "project:2",
                        "custom-section:portfolio-revision-10",
                        "custom-section-item:portfolio-revision-10:problem");
    }
}
