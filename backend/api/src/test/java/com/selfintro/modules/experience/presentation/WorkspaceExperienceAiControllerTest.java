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

class WorkspaceExperienceAiControllerTest {

    private AiWorkerClient aiWorkerClient;
    private WorkspaceAccessPolicy accessPolicy;
    private WorkspaceExperienceAiController controller;
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        aiWorkerClient = mock(AiWorkerClient.class);
        accessPolicy = mock(WorkspaceAccessPolicy.class);
        authentication = mock(Authentication.class);
        controller = new WorkspaceExperienceAiController(aiWorkerClient, accessPolicy);
    }

    @Test
    void suggestDelegatesToWorker() {
        allowWrite(42L);
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

        ExperienceSuggestionResponse response =
                controller.suggest(authentication, "w-demo", request);

        assertThat(response).isEqualTo(expected);
    }

    @Test
    void suggestStreamPipesToWorker() throws Exception {
        allowWrite(42L);
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

        StreamingResponseBody body =
                controller.suggestStream(authentication, "w-demo", request);
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
        allowWrite(42L);
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
                controller.generateNarrative(authentication, "w-demo", request);

        assertThat(response).isEqualTo(expected);
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
