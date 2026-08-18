package com.selfintro.modules.experience.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.experience.presentation.dto.ExperienceDetailNarrativeRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceDetailNarrativeResponse;
import com.selfintro.modules.experience.presentation.dto.ExperienceSuggestionRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceSuggestionResponse;
import java.io.ByteArrayOutputStream;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

class WorkspaceExperienceAiControllerTest {

    private AiWorkerClient aiWorkerClient;
    private WorkspaceExperienceAiController controller;

    @BeforeEach
    void setUp() {
        aiWorkerClient = mock(AiWorkerClient.class);
        controller = new WorkspaceExperienceAiController(aiWorkerClient);
    }

    @Test
    void suggestDelegatesToWorker() {
        ExperienceSuggestionRequest request =
                new ExperienceSuggestionRequest(
                        "ins",
                        "PROJECT",
                        "title",
                        null,
                        null,
                        null,
                        null,
                        null,
                        List.of(1L),
                        List.of(2L),
                        List.of(3L));
        ExperienceSuggestionResponse expected = new ExperienceSuggestionResponse(List.of());

        when(aiWorkerClient.post(
                        eq("/internal/workspaces/42/experiences/manage/ai/suggestions"),
                        eq(request),
                        eq(ExperienceSuggestionResponse.class)))
                .thenReturn(expected);

        ExperienceSuggestionResponse response = controller.suggest(42L, request);

        assertThat(response).isEqualTo(expected);
    }

    @Test
    void suggestStreamPipesToWorker() throws Exception {
        ExperienceSuggestionRequest request =
                new ExperienceSuggestionRequest(
                        "ins",
                        "PROJECT",
                        "title",
                        null,
                        null,
                        null,
                        null,
                        null,
                        List.of(1L),
                        List.of(2L),
                        List.of(3L));

        StreamingResponseBody body = controller.suggestStream(42L, request);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        body.writeTo(out);

        verify(aiWorkerClient)
                .pipePost(
                        eq("/internal/workspaces/42/experiences/manage/ai/suggestions/stream"),
                        eq(request),
                        eq(out));
    }

    @Test
    void generateNarrativeDelegatesToWorker() {
        ExperienceDetailNarrativeRequest request =
                new ExperienceDetailNarrativeRequest("c", "s", "a", "o");
        ExperienceDetailNarrativeResponse expected =
                new ExperienceDetailNarrativeResponse("narrative");

        when(aiWorkerClient.post(
                        eq("/internal/workspaces/42/experiences/manage/ai/details/narrative"),
                        eq(request),
                        eq(ExperienceDetailNarrativeResponse.class)))
                .thenReturn(expected);

        ExperienceDetailNarrativeResponse response = controller.generateNarrative(42L, request);

        assertThat(response).isEqualTo(expected);
    }
}
