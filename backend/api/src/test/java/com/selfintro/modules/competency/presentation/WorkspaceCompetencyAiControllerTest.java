package com.selfintro.modules.competency.presentation;

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
import com.selfintro.modules.competency.presentation.dto.CompetencySuggestionRequest;
import com.selfintro.modules.competency.presentation.dto.CompetencySuggestionResponse;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

class WorkspaceCompetencyAiControllerTest {

    private AiWorkerClient aiWorkerClient;
    private AiExecutionService aiExecutionService;
    private WorkspaceMember member;
    private WorkspaceCompetencyAiController controller;

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
        controller = new WorkspaceCompetencyAiController(aiWorkerClient, aiExecutionService);
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

        CompetencySuggestionResponse response = controller.suggest(member, null, request);

        assertThat(response).isEqualTo(expected);
    }

    @Test
    void suggestStreamPipesToWorker() throws Exception {
        CompetencySuggestionRequest request =
                new CompetencySuggestionRequest(
                        "ins", "title", "sum", List.of(1L), List.of(2L), List.of(3L));

        StreamingResponseBody body = controller.suggestStream(member, null, request);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        body.writeTo(out);

        verify(aiWorkerClient)
                .pipePost(
                        eq("/internal/workspaces/42/competencies/ai/suggestions/stream"),
                        eq(request),
                        eq(out));
    }
}
