package com.selfintro.modules.jobposting.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "workspace_job_map_setting")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspaceJobMapSetting {

    @Id
    @Column(name = "workspace_id")
    private Long workspaceId;

    @Column(name = "home_address", length = 255)
    private String homeAddress;

    @Column(name = "home_latitude", precision = 10, scale = 7)
    private BigDecimal homeLatitude;

    @Column(name = "home_longitude", precision = 10, scale = 7)
    private BigDecimal homeLongitude;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static WorkspaceJobMapSetting create(Long workspaceId, LocalDateTime now) {
        WorkspaceJobMapSetting setting = new WorkspaceJobMapSetting();
        setting.workspaceId = workspaceId;
        setting.createdAt = now;
        setting.updatedAt = now;
        return setting;
    }

    public void update(
            String homeAddress,
            BigDecimal homeLatitude,
            BigDecimal homeLongitude,
            LocalDateTime now) {
        this.homeAddress = homeAddress;
        this.homeLatitude = homeLatitude;
        this.homeLongitude = homeLongitude;
        this.updatedAt = now;
    }
}
