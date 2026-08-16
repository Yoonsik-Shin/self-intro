package com.selfintro.modules.jobposting.presentation;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.jobposting.application.WorkspaceJobApplicationCoverLetterService;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterSaveRequest;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

class WorkspaceJobCoverLetterControllerTest {

    private WorkspaceJobApplicationCoverLetterService service;
    private WorkspaceAccessPolicy accessPolicy;
    private WorkspaceJobCoverLetterController controller;
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        service = mock(WorkspaceJobApplicationCoverLetterService.class);
        accessPolicy = mock(WorkspaceAccessPolicy.class);
        authentication = mock(Authentication.class);
        controller = new WorkspaceJobCoverLetterController(service, accessPolicy);
    }

    @Test
    void viewerCanReadItemsFromResolvedWorkspaceOnly() {
        allowRead(42L);

        controller.list(authentication, "w-demo", 7L);

        verify(service).list(42L, 7L);
    }

    @Test
    void replaceRequiresEditorRole() {
        allowWrite(42L);
        JobPostingCoverLetterSaveRequest request = new JobPostingCoverLetterSaveRequest(List.of());

        controller.replace(authentication, "w-demo", 7L, request);

        verify(service).replace(42L, 7L, request);
    }

    private void allowRead(Long workspaceId) {
        WorkspaceMember member = memberOf(workspaceId);
        when(accessPolicy.requireAnyRole(
                        authentication,
                        "w-demo",
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR,
                        WorkspaceRole.VIEWER))
                .thenReturn(member);
    }

    private void allowWrite(Long workspaceId) {
        WorkspaceMember member = memberOf(workspaceId);
        when(accessPolicy.requireAnyRole(
                        authentication,
                        "w-demo",
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR))
                .thenReturn(member);
    }

    private WorkspaceMember memberOf(Long workspaceId) {
        Workspace workspace = mock(Workspace.class);
        WorkspaceMember member = mock(WorkspaceMember.class);
        when(workspace.getId()).thenReturn(workspaceId);
        when(member.getWorkspace()).thenReturn(workspace);
        return member;
    }
}
