package com.selfintro.jobposting.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.jobposting.application.JobPostingPrintDraftService;
import com.selfintro.modules.jobposting.presentation.dto.PrintTemplateRevisionRequest;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

class WorkspaceJobPrintDraftControllerTest {

    @Test
    void generationDelegatesToService() {
        JobPostingPrintDraftService service = mock(JobPostingPrintDraftService.class);
        SseEmitter emitter = new SseEmitter();
        when(service.generateStream(42L, 7L, "CLAUDE", null)).thenReturn(emitter);
        WorkspaceJobPrintDraftController controller = new WorkspaceJobPrintDraftController(service);

        assertThat(controller.generate(42L, 7L, "CLAUDE", null)).isSameAs(emitter);
    }

    @Test
    void revisionDelegatesToService() {
        JobPostingPrintDraftService service = mock(JobPostingPrintDraftService.class);
        WorkspaceJobPrintDraftController controller = new WorkspaceJobPrintDraftController(service);

        controller.revise(42L, 7L, 9L, new PrintTemplateRevisionRequest("강점을 앞쪽에 배치"), null, null);

        verify(service).reviseStream(42L, 7L, 9L, "강점을 앞쪽에 배치", null, null);
    }
}
