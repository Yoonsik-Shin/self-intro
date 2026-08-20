package com.selfintro.modules.portfolio.presentation;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyGenerateRequest;
import java.io.ByteArrayOutputStream;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

class WorkspacePortfolioCaseStudyAiControllerTest {

    private AiWorkerClient aiWorkerClient;
    private WorkspacePortfolioCaseStudyAiController controller;

    @BeforeEach
    void setUp() {
        aiWorkerClient = mock(AiWorkerClient.class);
        controller = new WorkspacePortfolioCaseStudyAiController(aiWorkerClient);
    }

    @Test
    void generateStreamPipesToWorker() throws Exception {
        PortfolioCaseStudyGenerateRequest request =
                new PortfolioCaseStudyGenerateRequest(
                        "ins", List.of(1L), List.of(2L), List.of(3L), null);

        StreamingResponseBody body = controller.generate(42L, 100L, request);
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
