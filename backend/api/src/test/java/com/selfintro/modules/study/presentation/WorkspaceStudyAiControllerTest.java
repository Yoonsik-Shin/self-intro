package com.selfintro.modules.study.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.study.presentation.dto.StudySuggestionRequest;
import com.selfintro.modules.study.presentation.dto.StudySuggestionResponse;
import java.io.ByteArrayOutputStream;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

class WorkspaceStudyAiControllerTest {

    private AiWorkerClient aiWorkerClient;
    private WorkspaceStudyAiController controller;

    @BeforeEach
    void setUp() {
        aiWorkerClient = mock(AiWorkerClient.class);
        controller = new WorkspaceStudyAiController(aiWorkerClient);
    }

    @Test
    void suggestDelegatesToWorker() {
        StudySuggestionRequest request =
                new StudySuggestionRequest(
                        "ins", "title", "sum", List.of(1L), List.of(2L), List.of(), List.of());
        StudySuggestionResponse expected = new StudySuggestionResponse(List.of());

        when(aiWorkerClient.post(
                        eq("/internal/workspaces/42/studies/manage/ai/suggestions"),
                        eq(request),
                        eq(StudySuggestionResponse.class)))
                .thenReturn(expected);

        StudySuggestionResponse response = controller.suggest(42L, request);

        assertThat(response).isEqualTo(expected);
    }

    @Test
    void suggestStreamPipesToWorker() throws Exception {
        StudySuggestionRequest request =
                new StudySuggestionRequest(
                        "ins", "title", "sum", List.of(1L), List.of(2L), List.of(), List.of());

        StreamingResponseBody body = controller.suggestStream(42L, request);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        body.writeTo(out);

        verify(aiWorkerClient)
                .pipePost(
                        eq("/internal/workspaces/42/studies/manage/ai/suggestions/stream"),
                        eq(request),
                        eq(out));
    }
}
