package com.selfintro.modules.portfolio.presentation;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioPrintDraftRevisionRequest;
import java.io.ByteArrayOutputStream;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

class WorkspacePortfolioDocumentDraftProxyControllerTest {

    @Test
    void proxiesDocumentRevisionToInternalWorkerWithEncodedModelQuery() throws Exception {
        AiWorkerClient client = mock(AiWorkerClient.class);
        WorkspacePortfolioDocumentDraftProxyController controller =
                new WorkspacePortfolioDocumentDraftProxyController(client);
        PortfolioPrintDraftRevisionRequest request =
                new PortfolioPrintDraftRevisionRequest("분량을 줄여줘");

        StreamingResponseBody body = controller.revise(42L, 9L, request, "CUSTOM", "model name/1");
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
