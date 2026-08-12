package com.selfintro.modules.identity.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "workspace_purge_checkpoint")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspacePurgeCheckpoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "purge_job_id", nullable = false)
    private Long purgeJobId;

    @Enumerated(EnumType.STRING)
    @Column(name = "store_type", nullable = false, length = 30)
    private WorkspacePurgeStore storeType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WorkspacePurgeCheckpointStatus status;

    @Column(name = "candidate_count", nullable = false)
    private long candidateCount;

    @Column(name = "blocker_code", length = 80)
    private String blockerCode;

    @Column(name = "inspection_summary", length = 500)
    private String inspectionSummary;

    @Column(name = "last_inspected_at")
    private LocalDateTime lastInspectedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static WorkspacePurgeCheckpoint pending(
            Long purgeJobId, WorkspacePurgeStore storeType, LocalDateTime now) {
        WorkspacePurgeCheckpoint checkpoint = new WorkspacePurgeCheckpoint();
        checkpoint.purgeJobId = purgeJobId;
        checkpoint.storeType = storeType;
        checkpoint.status = WorkspacePurgeCheckpointStatus.PENDING;
        checkpoint.createdAt = now;
        checkpoint.updatedAt = now;
        return checkpoint;
    }

    public void ready(long candidates, String summary, LocalDateTime now) {
        inspect(WorkspacePurgeCheckpointStatus.READY, candidates, null, summary, now);
    }

    public void blocked(long candidates, String blockerCode, String summary, LocalDateTime now) {
        inspect(WorkspacePurgeCheckpointStatus.BLOCKED, candidates, blockerCode, summary, now);
    }

    public void completed(String summary, LocalDateTime now) {
        inspect(WorkspacePurgeCheckpointStatus.COMPLETED, 0, null, summary, now);
        completedAt = now;
    }

    public void failed(String errorCode, String summary, LocalDateTime now) {
        inspect(WorkspacePurgeCheckpointStatus.FAILED, candidateCount, errorCode, summary, now);
    }

    private void inspect(
            WorkspacePurgeCheckpointStatus nextStatus,
            long candidates,
            String nextBlockerCode,
            String summary,
            LocalDateTime now) {
        status = nextStatus;
        candidateCount = Math.max(0, candidates);
        blockerCode = nextBlockerCode;
        inspectionSummary =
                summary == null ? null : summary.substring(0, Math.min(500, summary.length()));
        lastInspectedAt = now;
        updatedAt = now;
    }
}
