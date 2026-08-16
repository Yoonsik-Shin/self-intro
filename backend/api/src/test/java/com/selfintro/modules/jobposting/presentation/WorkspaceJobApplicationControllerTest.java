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
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobMapSettingRequest;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobMapSettingResponse;
import java.math.BigDecimal;
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

    @Test
    void viewerCanReadWorkspacePrivateMapSetting() {
        allowRead(42L);
        WorkspaceJobMapSettingResponse expected =
                new WorkspaceJobMapSettingResponse(
                        "서울시청", new BigDecimal("37.5665000"), new BigDecimal("126.9780000"));
        when(service.mapSetting(42L)).thenReturn(expected);

        assertThat(controller.mapSetting(authentication, "w-demo")).isEqualTo(expected);

        verify(service).mapSetting(42L);
    }

    @Test
    void mapSettingUpdateRequiresWorkspaceEditorRole() {
        allowWrite(42L);
        WorkspaceJobMapSettingRequest request =
                new WorkspaceJobMapSettingRequest(
                        "서울시청", new BigDecimal("37.5665000"), new BigDecimal("126.9780000"));
        WorkspaceJobMapSettingResponse expected =
                new WorkspaceJobMapSettingResponse(
                        request.homeAddress(), request.homeLatitude(), request.homeLongitude());
        when(service.updateMapSetting(42L, request)).thenReturn(expected);

        assertThat(controller.updateMapSetting(authentication, "w-demo", request))
                .isEqualTo(expected);

        verify(accessPolicy)
                .requireAnyRole(
                        authentication,
                        "w-demo",
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR);
        verify(service).updateMapSetting(42L, request);
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
