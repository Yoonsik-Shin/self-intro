package com.selfintro.modules.jobposting.presentation.dto;

import com.selfintro.modules.jobposting.domain.entity.WorkspaceJobMapSetting;
import java.math.BigDecimal;

public record WorkspaceJobMapSettingResponse(
        String homeAddress, BigDecimal homeLatitude, BigDecimal homeLongitude) {

    public static WorkspaceJobMapSettingResponse empty() {
        return new WorkspaceJobMapSettingResponse(null, null, null);
    }

    public static WorkspaceJobMapSettingResponse from(WorkspaceJobMapSetting entity) {
        return new WorkspaceJobMapSettingResponse(
                entity.getHomeAddress(), entity.getHomeLatitude(), entity.getHomeLongitude());
    }
}
