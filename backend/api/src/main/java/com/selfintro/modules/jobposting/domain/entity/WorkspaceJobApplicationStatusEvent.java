package com.selfintro.modules.jobposting.domain.entity;

import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "workspace_job_application_status_event")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspaceJobApplicationStatusEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workspace_job_application_id", nullable = false, updatable = false)
    private Long workspaceJobApplicationId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 30)
    private JobPostingStatus status;

    @Column(updatable = false, length = 1000)
    private String memo;

    @Column(name = "changed_at", nullable = false, updatable = false)
    private LocalDateTime changedAt;

    public static WorkspaceJobApplicationStatusEvent of(
            Long workspaceJobApplicationId,
            JobPostingStatus status,
            String memo,
            LocalDateTime changedAt) {
        WorkspaceJobApplicationStatusEvent event = new WorkspaceJobApplicationStatusEvent();
        event.workspaceJobApplicationId = workspaceJobApplicationId;
        event.status = status;
        event.memo = memo;
        event.changedAt = changedAt;
        return event;
    }
}
