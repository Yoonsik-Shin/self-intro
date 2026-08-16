package com.selfintro.modules.competency.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.competency.presentation.dto.CompetencySuggestionRequest;
import com.selfintro.modules.competency.presentation.dto.CompetencySuggestionResponse;
import java.io.ByteArrayOutputStream;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

class WorkspaceCompetencyAiControllerTest {

    private AiWorkerClient aiWorkerClient;
    private WorkspaceCompetencyAiController controller;

    @BeforeEach
    void setUp() {
        aiWorkerClient = mock(AiWorkerClient.class);
        controller = new WorkspaceCompetencyAiController(aiWorkerClient);
    }

    @Test
    void suggestDelegatesToWorker() {
        CompetencySuggestionRequest request =
                new CompetencySuggestionRequest(
                        "ins", "title", "sum", List.of(1L), List.of(2L), List.of(3L));
        CompetencySuggestionResponse expected = new CompetencySuggestionResponse(List.of());

        when(aiWorkerClient.post(
                        eq("/internal/workspaces/42/competencies/ai/suggestions"),
                        eq(request),
                        eq(CompetencySuggestionResponse.class)))
                .thenReturn(expected);

        CompetencySuggestionResponse response = controller.suggest(42L, request);

        assertThat(response).isEqualTo(expected);
    }

    @Test
    void suggestStreamPipesToWorker() throws Exception {
        CompetencySuggestionRequest request =
                new CompetencySuggestionRequest(
                        "ins", "title", "sum", List.of(1L), List.of(2L), List.of(3L));

        StreamingResponseBody body = controller.suggestStream(42L, request);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        body.writeTo(out);

        verify(aiWorkerClient)
                .pipePost(
                        eq("/internal/workspaces/42/competencies/ai/suggestions/stream"),
                        eq(request),
                        eq(out));
    }
}
