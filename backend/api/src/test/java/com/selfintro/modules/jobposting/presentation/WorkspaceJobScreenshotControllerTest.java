package com.selfintro.modules.jobposting.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.selfintro.modules.jobposting.application.WorkspaceJobScreenshotUploadService;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobScreenshotUploadRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class WorkspaceJobScreenshotControllerTest {

    private WorkspaceJobScreenshotUploadService service;
    private WorkspaceJobScreenshotController controller;

    @BeforeEach
    void setUp() {
        service = mock(WorkspaceJobScreenshotUploadService.class);
        controller = new WorkspaceJobScreenshotController(service);
    }

    @Test
    void issueUsesWorkspaceResolvedFromEditorRole() {
        WorkspaceJobScreenshotUploadRequest request =
                new WorkspaceJobScreenshotUploadRequest("job.png", "image/png", 1024);

        controller.issue(42L, request);

        verify(service).issue(42L, request);
    }

    @Test
    void cancelUsesWorkspaceResolvedFromEditorRole() {
        var response = controller.cancel(42L, "upload-id");

        assertThat(response.getStatusCode().value()).isEqualTo(204);
        verify(service).cancel(42L, "upload-id");
    }
}
