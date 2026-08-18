package com.selfintro.jobposting.presentation;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.selfintro.jobposting.application.JobApplicationUrlParseService;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationImageParseRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationUrlParseRequest;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class WorkspaceJobPrivateSourceParseControllerTest {

    private JobApplicationUrlParseService parseService;
    private WorkspaceJobPrivateSourceParseController controller;

    @BeforeEach
    void setUp() {
        parseService = mock(JobApplicationUrlParseService.class);
        controller = new WorkspaceJobPrivateSourceParseController(parseService);
    }

    @Test
    void urlParsingDelegatesToParseService() {
        JobApplicationUrlParseRequest request =
                new JobApplicationUrlParseRequest("https://example.com/job");

        controller.parseUrl(42L, request);

        verify(parseService).parse("https://example.com/job");
    }

    @Test
    void imageParsingDelegatesToParseService() {
        JobApplicationImageParseRequest request =
                new JobApplicationImageParseRequest(
                        List.of(
                                new JobApplicationImageParseRequest.ImagePart(
                                        new byte[] {1, 2, 3}, "image/png")));

        controller.parseImages(42L, request);

        verify(parseService).parseFromImages(anyList());
    }
}
