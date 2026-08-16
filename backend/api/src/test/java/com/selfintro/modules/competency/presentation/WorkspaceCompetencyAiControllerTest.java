package com.selfintro.modules.competency.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.competency.presentation.dto.CompetencySuggestionRequest;
import com.selfintro.modules.competency.presentation.dto.CompetencySuggestionResponse;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import java.io.ByteArrayOutputStream;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

class WorkspaceCompetencyAiControllerTest {

    private AiWorkerClient aiWorkerClient;
    private WorkspaceAccessPolicy accessPolicy;
    private WorkspaceCompetencyAiController controller;
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        aiWorkerClient = mock(AiWorkerClient.class);
        accessPolicy = mock(WorkspaceAccessPolicy.class);
        authentication = mock(Authentication.class);
        controller = new WorkspaceCompetencyAiController(aiWorkerClient, accessPolicy);
    }

    @Test
    void suggestDelegatesToWorker() {
        allowWrite(42L);
        CompetencySuggestionRequest request =
                new CompetencySuggestionRequest(
                        "ins", "title", "sum", List.of(1L), List.of(2L), List.of(3L));
        CompetencySuggestionResponse expected = new CompetencySuggestionResponse(List.of());

        when(aiWorkerClient.post(
                        eq("/internal/workspaces/42/competencies/ai/suggestions"),
                        eq(request),
                        eq(CompetencySuggestionResponse.class)))
                .thenReturn(expected);

        CompetencySuggestionResponse response =
                controller.suggest(authentication, "w-demo", request);

        assertThat(response).isEqualTo(expected);
    }

    @Test
    void suggestStreamPipesToWorker() throws Exception {
        allowWrite(42L);
        CompetencySuggestionRequest request =
                new CompetencySuggestionRequest(
                        "ins", "title", "sum", List.of(1L), List.of(2L), List.of(3L));

        StreamingResponseBody body =
                controller.suggestStream(authentication, "w-demo", request);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        body.writeTo(out);

        verify(aiWorkerClient)
                .pipePost(
                        eq("/internal/workspaces/42/competencies/ai/suggestions/stream"),
                        eq(request),
                        eq(out));
    }

    private void allowWrite(Long workspaceId) {
        Workspace workspace = mock(Workspace.class);
        WorkspaceMember member = mock(WorkspaceMember.class);
        when(workspace.getId()).thenReturn(workspaceId);
        when(member.getWorkspace()).thenReturn(workspace);
        when(accessPolicy.requireAnyRole(
                        authentication,
                        "w-demo",
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR))
                .thenReturn(member);
    }
}
