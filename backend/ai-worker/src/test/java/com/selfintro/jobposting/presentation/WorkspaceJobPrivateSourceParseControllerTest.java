package com.selfintro.jobposting.presentation;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.jobposting.application.JobApplicationUrlParseService;
import com.selfintro.modules.jobposting.application.WorkspaceJobScreenshotUploadService;
import com.selfintro.modules.jobposting.application.WorkspaceJobScreenshotUploadService.ClaimedUpload;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationUrlParseRequest;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobScreenshotParseRequest;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class WorkspaceJobPrivateSourceParseControllerTest {

    private JobApplicationUrlParseService parseService;
    private WorkspaceJobScreenshotUploadService screenshotService;
    private WorkspaceJobPrivateSourceParseController controller;

    @BeforeEach
    void setUp() {
        parseService = mock(JobApplicationUrlParseService.class);
        screenshotService = mock(WorkspaceJobScreenshotUploadService.class);
        controller = new WorkspaceJobPrivateSourceParseController(parseService, screenshotService);
    }

    @Test
    void urlParsingDelegatesToParseService() {
        JobApplicationUrlParseRequest request =
                new JobApplicationUrlParseRequest("https://example.com/job");

        controller.parseUrl(42L, request);

        verify(parseService).parse("https://example.com/job");
    }

    @Test
    void screenshotSourcesAreDeletedEvenWhenParsingFails() {
        ClaimedUpload upload = new ClaimedUpload("ticket-1", "private-key", "image/png");
        when(screenshotService.claim(42L, List.of("ticket-1"))).thenReturn(List.of(upload));
        when(screenshotService.read(upload)).thenReturn(new byte[] {1, 2, 3});
        when(parseService.parseFromImages(org.mockito.ArgumentMatchers.anyList()))
                .thenThrow(new IllegalStateException("AI failure"));

        assertThatThrownBy(
                        () ->
                                controller.parseScreenshots(
                                        42L,
                                        new WorkspaceJobScreenshotParseRequest(
                                                List.of("ticket-1"))))
                .isInstanceOf(IllegalStateException.class);

        verify(screenshotService).deleteClaimed(42L, List.of(upload));
    }
}
