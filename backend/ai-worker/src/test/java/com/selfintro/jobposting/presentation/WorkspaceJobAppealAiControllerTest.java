package com.selfintro.jobposting.presentation;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.selfintro.jobposting.application.JobPostingAppealService;
import org.junit.jupiter.api.Test;

class WorkspaceJobAppealAiControllerTest {

    @Test
    void analysisDelegatesToService() {
        JobPostingAppealService service = mock(JobPostingAppealService.class);
        WorkspaceJobAppealAiController controller = new WorkspaceJobAppealAiController(service);

        controller.analyze(42L, 7L, "CLAUDE", null);

        verify(service).analyzeAppeal(42L, 7L, "CLAUDE", null);
    }
}
