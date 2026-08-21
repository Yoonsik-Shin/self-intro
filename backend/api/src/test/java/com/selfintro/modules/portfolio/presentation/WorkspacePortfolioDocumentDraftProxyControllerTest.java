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
import com.selfintro.modules.portfolio.presentation.dto.PortfolioPrintDraftRevisionRequest;
import java.io.ByteArrayOutputStream;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

class WorkspacePortfolioDocumentDraftProxyControllerTest {

    @Test
    void proxiesDocumentRevisionToInternalWorkerWithEncodedModelQuery() throws Exception {
        AiWorkerClient client = mock(AiWorkerClient.class);
        AiExecutionService aiExecutionService = mock(AiExecutionService.class);
        WorkspaceMember member = mock(WorkspaceMember.class, RETURNS_DEEP_STUBS);
        when(member.getWorkspace().getId()).thenReturn(42L);
        when(member.getUser().getId()).thenReturn(7L);
        doAnswer(
                        invocation -> {
                            ((Runnable) invocation.getArgument(1)).run();
                            return null;
                        })
                .when(aiExecutionService)
                .executeVoid(any(), any());
        WorkspacePortfolioDocumentDraftProxyController controller =
                new WorkspacePortfolioDocumentDraftProxyController(client, aiExecutionService);
        PortfolioPrintDraftRevisionRequest request =
                new PortfolioPrintDraftRevisionRequest("분량을 줄여줘");

        StreamingResponseBody body =
                controller.revise(member, 9L, null, request, "CUSTOM", "model name/1");
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        body.writeTo(output);

        verify(client)
                .pipePost(
                        eq(
                                "/internal/workspaces/42/portfolio-documents/9/revise/stream"
                                        + "?aiModel=CUSTOM&customModelName=model+name%2F1"),
                        eq(request),
                        eq(output));
    }
}
