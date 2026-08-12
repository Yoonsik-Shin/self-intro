package com.selfintro.modules.identity.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "workspace_purge_job")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspacePurgeJob {

    public static final String INVENTORY_VERSION = "workspace-purge-v1";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workspace_id", nullable = false, unique = true)
    private Long workspaceId;

    @Column(name = "workspace_public_key", nullable = false, columnDefinition = "BINARY(16)")
    private UUID workspacePublicKey;

    @Column(name = "requested_by_user_id", nullable = false)
    private Long requestedByUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private WorkspacePurgeJobStatus status;

    @Column(name = "eligible_at", nullable = false)
    private LocalDateTime eligibleAt;

    @Column(name = "last_inspected_at")
    private LocalDateTime lastInspectedAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Column(name = "blocker_count", nullable = false)
    private int blockerCount;

    @Column(name = "inventory_version", nullable = false, length = 40)
    private String inventoryVersion;

    @Column(name = "last_error_code", length = 80)
    private String lastErrorCode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static WorkspacePurgeJob schedule(
            Workspace workspace, Long requestedByUserId, LocalDateTime now) {
        if (workspace.getPurgeAfter() == null) {
            throw new IllegalStateException("폐쇄된 Workspace의 purge 시각이 필요합니다.");
        }
        WorkspacePurgeJob job = new WorkspacePurgeJob();
        job.workspaceId = workspace.getId();
        job.workspacePublicKey = workspace.getPublicKey();
        job.requestedByUserId = requestedByUserId;
        job.status = WorkspacePurgeJobStatus.PENDING_GRACE;
        job.eligibleAt = workspace.getPurgeAfter();
        job.inventoryVersion = INVENTORY_VERSION;
        job.createdAt = now;
        job.updatedAt = now;
        return job;
    }

    public void inspected(LocalDateTime now, int blockers) {
        lastInspectedAt = now;
        blockerCount = Math.max(0, blockers);
        status =
                blockers > 0
                        ? WorkspacePurgeJobStatus.BLOCKED
                        : eligibleAt.isAfter(now)
                                ? WorkspacePurgeJobStatus.PENDING_GRACE
                                : WorkspacePurgeJobStatus.READY;
        lastErrorCode = blockers > 0 ? "PURGE_CHECKPOINT_BLOCKED" : null;
        updatedAt = now;
    }

    public boolean claim(LocalDateTime now, LocalDateTime staleBefore) {
        boolean ready = status == WorkspacePurgeJobStatus.READY;
        boolean retryable = status == WorkspacePurgeJobStatus.FAILED;
        boolean stale =
                status == WorkspacePurgeJobStatus.PURGING
                        && updatedAt != null
                        && updatedAt.isBefore(staleBefore);
        if ((!ready && !retryable && !stale) || eligibleAt.isAfter(now)) return false;
        status = WorkspacePurgeJobStatus.PURGING;
        startedAt = now;
        attemptCount++;
        lastErrorCode = null;
        updatedAt = now;
        return true;
    }

    public void fail(String errorCode, LocalDateTime now) {
        status = WorkspacePurgeJobStatus.FAILED;
        lastErrorCode = errorCode;
        updatedAt = now;
    }

    public void heartbeat(LocalDateTime now) {
        if (status != WorkspacePurgeJobStatus.PURGING) {
            throw new IllegalStateException("Only a running purge job can renew its lease.");
        }
        updatedAt = now;
    }

    public void complete(LocalDateTime now) {
        status = WorkspacePurgeJobStatus.COMPLETED;
        blockerCount = 0;
        lastErrorCode = null;
        completedAt = now;
        updatedAt = now;
    }
}
