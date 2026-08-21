package com.selfintro.modules.portfolio.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.aiusage.application.AiExecutionService;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyGenerateRequest;
import java.io.ByteArrayOutputStream;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

class WorkspacePortfolioCaseStudyAiControllerTest {

    private AiWorkerClient aiWorkerClient;
    private AiExecutionService aiExecutionService;
    private WorkspaceMember member;
    private WorkspacePortfolioCaseStudyAiController controller;

    @BeforeEach
    void setUp() {
        aiWorkerClient = mock(AiWorkerClient.class);
        aiExecutionService = mock(AiExecutionService.class);
        member = mock(WorkspaceMember.class, RETURNS_DEEP_STUBS);
        when(member.getWorkspace().getId()).thenReturn(42L);
        when(member.getUser().getId()).thenReturn(7L);
        doAnswer(
                        invocation -> {
                            ((Runnable) invocation.getArgument(1)).run();
                            return null;
                        })
                .when(aiExecutionService)
                .executeVoid(any(), any());
        controller =
                new WorkspacePortfolioCaseStudyAiController(aiWorkerClient, aiExecutionService);
    }

    @Test
    void generateStreamPipesToWorker() throws Exception {
        PortfolioCaseStudyGenerateRequest request =
                new PortfolioCaseStudyGenerateRequest(
                        "ins", List.of(1L), List.of(2L), List.of(3L), null, null);

        StreamingResponseBody body = controller.generate(member, 100L, null, request);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        body.writeTo(out);

        verify(aiWorkerClient)
                .pipePost(
                        eq(
                                "/internal/workspaces/42/portfolio/case-studies/manage/100/revisions/generate"),
                        eq(request),
                        eq(out));
    }
}
