package com.selfintro.jobposting.presentation;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.jobposting.application.JobApplicationUrlParseService;
import com.selfintro.jobposting.presentation.dto.JobApplicationUrlParseRequest;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.jobposting.application.WorkspaceJobScreenshotUploadService;
import com.selfintro.modules.jobposting.application.WorkspaceJobScreenshotUploadService.ClaimedUpload;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobScreenshotParseRequest;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

class WorkspaceJobPrivateSourceParseControllerTest {

    private JobApplicationUrlParseService parseService;
    private WorkspaceJobScreenshotUploadService screenshotService;
    private WorkspaceAccessPolicy accessPolicy;
    private Authentication authentication;
    private WorkspaceJobPrivateSourceParseController controller;

    @BeforeEach
    void setUp() {
        parseService = mock(JobApplicationUrlParseService.class);
        screenshotService = mock(WorkspaceJobScreenshotUploadService.class);
        accessPolicy = mock(WorkspaceAccessPolicy.class);
        authentication = mock(Authentication.class);
        controller =
                new WorkspaceJobPrivateSourceParseController(
                        parseService, screenshotService, accessPolicy);
    }

    @Test
    void urlParsingRequiresWriteAccessWithoutSavingTheUrl() {
        allowWrite(42L);
        JobApplicationUrlParseRequest request =
                new JobApplicationUrlParseRequest("https://example.com/job");

        controller.parseUrl(authentication, "w-demo", request);

        verify(parseService).parse("https://example.com/job");
    }

    @Test
    void screenshotSourcesAreDeletedEvenWhenParsingFails() {
        allowWrite(42L);
        ClaimedUpload upload = new ClaimedUpload("ticket-1", "private-key", "image/png");
        when(screenshotService.claim(42L, List.of("ticket-1"))).thenReturn(List.of(upload));
        when(screenshotService.read(upload)).thenReturn(new byte[] {1, 2, 3});
        when(parseService.parseFromImages(org.mockito.ArgumentMatchers.anyList()))
                .thenThrow(new IllegalStateException("AI failure"));

        assertThatThrownBy(
                        () ->
                                controller.parseScreenshots(
                                        authentication,
                                        "w-demo",
                                        new WorkspaceJobScreenshotParseRequest(
                                                List.of("ticket-1"))))
                .isInstanceOf(IllegalStateException.class);

        verify(screenshotService).deleteClaimed(42L, List.of(upload));
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
