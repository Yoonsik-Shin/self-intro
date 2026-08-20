package com.selfintro.portfolio.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.selfintro.modules.printtemplate.domain.entity.PrintTemplate;
import java.util.List;
import org.junit.jupiter.api.Test;

class PortfolioPrintDraftServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final PortfolioPrintDraftService service =
            new PortfolioPrintDraftService(null, null, null, null, null, null, objectMapper);

    @Test
    void updatesOnlyPinnedPortfolioSectionsAndPreservesSourceMetadata() throws Exception {
        ObjectNode current =
                (ObjectNode)
                        objectMapper.readTree(
                                """
                                {"customSections":[
                                  {"id":"portfolio-revision-10","title":"결제 개선",\
                                   "source":{"type":"PORTFOLIO_CASE_STUDY_REVISION","caseStudyId":3,"revisionId":10,"revisionVersion":2},\
                                   "items":[{"id":"problem","title":"문제","content":"결제 지연을 분석했습니다."}]},
                                  {"id":"manual-note","title":"메모","items":[{"id":"note","title":"","content":"유지"}]}
                                ]}
                                """);
        JsonNode candidates =
                objectMapper.readTree(
                        """
                        [{"id":"portfolio-revision-10","title":"결제 흐름 개선",\
                          "items":[{"id":"problem","title":"병목 분석","content":"결제 지연 999건을 해결했습니다."}]},
                         {"id":"manual-note","title":"변경 시도","items":[]}]
                        """);

        ObjectNode merged = service.mergeDocumentPortfolioSections(current, candidates);

        JsonNode portfolio = merged.path("customSections").get(0);
        assertThat(portfolio.path("title").asText()).isEqualTo("결제 흐름 개선");
        assertThat(portfolio.path("source").path("revisionId").asLong()).isEqualTo(10L);
        assertThat(portfolio.path("items").get(0).path("title").asText()).isEqualTo("병목 분석");
        assertThat(portfolio.path("items").get(0).path("content").asText())
                .isEqualTo("결제 지연을 분석했습니다.");
        assertThat(merged.path("customSections").get(1).path("title").asText()).isEqualTo("메모");
    }

    @Test
    void acceptsOnlyCompletePermutationForDocumentSectionOrder() throws Exception {
        PrintTemplate current =
                PrintTemplate.create(
                        1L,
                        "통합 포트폴리오",
                        "[]",
                        "[\"skills\",\"career\",\"custom-section:portfolio-revision-10\"]",
                        "{}",
                        true,
                        0);
        JsonNode valid =
                objectMapper.readTree(
                        "{\"sectionOrder\":[\"career\",\"custom-section:portfolio-revision-10\",\"skills\"]}");
        JsonNode invalid = objectMapper.readTree("{\"sectionOrder\":[\"career\",\"skills\"]}");

        assertThat(service.validatedDocumentSectionOrder(current, valid))
                .containsExactly("career", "custom-section:portfolio-revision-10", "skills");
        assertThat(service.validatedDocumentSectionOrder(current, invalid))
                .containsExactly("skills", "career", "custom-section:portfolio-revision-10");
    }

    @Test
    void limitsAiExclusionsToPinnedPortfolioAtomIds() throws Exception {
        PrintTemplate current =
                PrintTemplate.create(
                        1L,
                        "통합 포트폴리오",
                        "[\"skills\",\"custom-section-item:portfolio-revision-10:problem\"]",
                        "[]",
                        "{}",
                        true,
                        0);
        ArrayNode sections =
                (ArrayNode)
                        objectMapper.readTree(
                                "[{\"id\":\"portfolio-revision-10\",\"items\":[{\"id\":\"problem\"},{\"id\":\"outcome\"}]}]");
        JsonNode plan =
                objectMapper.readTree(
                        "{\"excludedPortfolioIds\":[\"custom-section-item:portfolio-revision-10:outcome\",\"custom-section:invented\",\"skills\"]}");

        List<String> merged = service.mergeDocumentExcludedIds(current, sections, plan);

        assertThat(merged)
                .containsExactly("skills", "custom-section-item:portfolio-revision-10:outcome");
    }
}
