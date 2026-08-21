package com.selfintro.modules.experience.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.aiusage.application.AiExecutionService;
import com.selfintro.modules.experience.presentation.dto.ExperienceDetailNarrativeRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceDetailNarrativeResponse;
import com.selfintro.modules.experience.presentation.dto.ExperienceSuggestionRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceSuggestionResponse;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

class WorkspaceExperienceAiControllerTest {

    private AiWorkerClient aiWorkerClient;
    private AiExecutionService aiExecutionService;
    private WorkspaceMember member;
    private WorkspaceExperienceAiController controller;

    @BeforeEach
    void setUp() {
        aiWorkerClient = mock(AiWorkerClient.class);
        aiExecutionService = mock(AiExecutionService.class);
        member = mock(WorkspaceMember.class, RETURNS_DEEP_STUBS);
        when(member.getWorkspace().getId()).thenReturn(42L);
        when(member.getUser().getId()).thenReturn(7L);
        when(aiExecutionService.execute(any(), any()))
                .thenAnswer(invocation -> ((Supplier<?>) invocation.getArgument(1)).get());
        doAnswer(
                        invocation -> {
                            ((Runnable) invocation.getArgument(1)).run();
                            return null;
                        })
                .when(aiExecutionService)
                .executeVoid(any(), any());
        controller = new WorkspaceExperienceAiController(aiWorkerClient, aiExecutionService);
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

        ExperienceSuggestionResponse response = controller.suggest(member, null, request);

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

        StreamingResponseBody body = controller.suggestStream(member, null, request);
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

        ExperienceDetailNarrativeResponse response =
                controller.generateNarrative(member, null, request);

        assertThat(response).isEqualTo(expected);
    }
}
