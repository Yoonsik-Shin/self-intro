package com.selfintro.modules.portfolio.presentation;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyGenerateRequest;
import java.io.ByteArrayOutputStream;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

class WorkspacePortfolioCaseStudyAiControllerTest {

    private AiWorkerClient aiWorkerClient;
    private WorkspaceAccessPolicy accessPolicy;
    private WorkspacePortfolioCaseStudyAiController controller;
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        aiWorkerClient = mock(AiWorkerClient.class);
        accessPolicy = mock(WorkspaceAccessPolicy.class);
        authentication = mock(Authentication.class);
        controller = new WorkspacePortfolioCaseStudyAiController(aiWorkerClient, accessPolicy);
    }

    @Test
    void generateStreamPipesToWorker() throws Exception {
        allowWrite(42L);
        PortfolioCaseStudyGenerateRequest request =
                new PortfolioCaseStudyGenerateRequest("ins", List.of(1L), List.of(2L));

        StreamingResponseBody body =
                controller.generate(authentication, "w-demo", 100L, request);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        body.writeTo(out);

        verify(aiWorkerClient)
                .pipePost(
                        eq("/internal/workspaces/42/portfolio/case-studies/manage/100/revisions/generate"),
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
