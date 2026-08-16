package com.selfintro.modules.jobposting.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.jobposting.application.WorkspaceJobScreenshotUploadService;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobScreenshotUploadRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

class WorkspaceJobScreenshotControllerTest {

    private WorkspaceJobScreenshotUploadService service;
    private WorkspaceAccessPolicy accessPolicy;
    private WorkspaceJobScreenshotController controller;
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        service = mock(WorkspaceJobScreenshotUploadService.class);
        accessPolicy = mock(WorkspaceAccessPolicy.class);
        authentication = mock(Authentication.class);
        controller = new WorkspaceJobScreenshotController(service, accessPolicy);
    }

    @Test
    void issueUsesWorkspaceResolvedFromEditorRole() {
        allowWrite(42L);
        WorkspaceJobScreenshotUploadRequest request =
                new WorkspaceJobScreenshotUploadRequest("job.png", "image/png", 1024);

        controller.issue(authentication, "w-demo", request);

        verify(service).issue(42L, request);
    }

    @Test
    void cancelUsesWorkspaceResolvedFromEditorRole() {
        allowWrite(42L);

        var response = controller.cancel(authentication, "w-demo", "upload-id");

        assertThat(response.getStatusCode().value()).isEqualTo(204);
        verify(service).cancel(42L, "upload-id");
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
