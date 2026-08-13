package com.selfintro.modules.jobposting.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.jobposting.application.WorkspaceJobApplicationService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

class WorkspaceJobApplicationControllerTest {

    private WorkspaceJobApplicationService service;
    private WorkspaceAccessPolicy accessPolicy;
    private WorkspaceJobApplicationController controller;
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        service = mock(WorkspaceJobApplicationService.class);
        accessPolicy = mock(WorkspaceAccessPolicy.class);
        authentication = mock(Authentication.class);
        controller = new WorkspaceJobApplicationController(service, accessPolicy);
    }

    @Test
    void viewerCanReadOnlyAfterWorkspaceRoleCheck() {
        allowRead(42L);
        when(service.list(42L)).thenReturn(List.of());

        assertThat(controller.list(authentication, "w-demo")).isEmpty();

        verify(accessPolicy)
                .requireAnyRole(
                        authentication,
                        "w-demo",
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR,
                        WorkspaceRole.VIEWER);
        verify(service).list(42L);
    }

    @Test
    void removalRequiresWorkspaceEditorRole() {
        allowWrite(42L);

        var response = controller.remove(authentication, "w-demo", 7L);

        assertThat(response.getStatusCode().value()).isEqualTo(204);
        verify(accessPolicy)
                .requireAnyRole(
                        authentication,
                        "w-demo",
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR);
        verify(service).remove(42L, 7L);
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
