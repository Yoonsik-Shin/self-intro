package com.selfintro.modules.jobposting.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.jobposting.application.WorkspaceJobApplicationService;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobMapSettingRequest;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobMapSettingResponse;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class WorkspaceJobApplicationControllerTest {

    private WorkspaceJobApplicationService service;
    private WorkspaceJobApplicationController controller;

    @BeforeEach
    void setUp() {
        service = mock(WorkspaceJobApplicationService.class);
        controller = new WorkspaceJobApplicationController(service);
    }

    @Test
    void viewerCanReadOnlyAfterWorkspaceRoleCheck() {
        when(service.list(42L)).thenReturn(List.of());

        assertThat(controller.list(42L)).isEmpty();

        verify(service).list(42L);
    }

    @Test
    void removalRequiresWorkspaceEditorRole() {
        var response = controller.remove(42L, 7L);

        assertThat(response.getStatusCode().value()).isEqualTo(204);
        verify(service).remove(42L, 7L);
    }

    @Test
    void viewerCanReadWorkspacePrivateMapSetting() {
        WorkspaceJobMapSettingResponse expected =
                new WorkspaceJobMapSettingResponse(
                        "서울시청", new BigDecimal("37.5665000"), new BigDecimal("126.9780000"));
        when(service.mapSetting(42L)).thenReturn(expected);

        assertThat(controller.mapSetting(42L)).isEqualTo(expected);

        verify(service).mapSetting(42L);
    }

    @Test
    void mapSettingUpdateRequiresWorkspaceEditorRole() {
        WorkspaceJobMapSettingRequest request =
                new WorkspaceJobMapSettingRequest(
                        "서울시청", new BigDecimal("37.5665000"), new BigDecimal("126.9780000"));
        WorkspaceJobMapSettingResponse expected =
                new WorkspaceJobMapSettingResponse(
                        request.homeAddress(), request.homeLatitude(), request.homeLongitude());
        when(service.updateMapSetting(42L, request)).thenReturn(expected);

        assertThat(controller.updateMapSetting(42L, request)).isEqualTo(expected);

        verify(service).updateMapSetting(42L, request);
    }
}
