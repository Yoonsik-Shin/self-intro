package com.selfintro.modules.identity.application;

import com.selfintro.modules.identity.domain.WorkspacePurgeCheckpoint;
import com.selfintro.modules.identity.domain.WorkspacePurgeCheckpointRepository;
import com.selfintro.modules.identity.domain.WorkspacePurgeCheckpointStatus;
import com.selfintro.modules.identity.domain.WorkspacePurgeJob;
import com.selfintro.modules.identity.domain.WorkspacePurgeJobRepository;
import com.selfintro.modules.identity.domain.WorkspacePurgeJobStatus;
import com.selfintro.modules.identity.domain.WorkspacePurgeStore;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Keeps database transactions short while a purge executor calls external storage providers. Every
 * mutation locks the job row, so multiple Worker replicas cannot execute the same job at the same
 * time. Provider deletion remains idempotent to cover a crash after deletion but before a
 * checkpoint commit.
 */
@Service
@RequiredArgsConstructor
public class WorkspacePurgeExecutionStateService {

    private final WorkspacePurgeJobRepository jobRepository;
    private final WorkspacePurgeCheckpointRepository checkpointRepository;

    @Transactional(readOnly = true)
    public List<Long> findInspectionCandidateIds(LocalDateTime now, int batchSize) {
        return jobRepository.findInspectionCandidateIds(now, firstPage(batchSize));
    }

    @Transactional(readOnly = true)
    public List<Long> findExecutionCandidateIds(
            LocalDateTime now, LocalDateTime staleBefore, int batchSize) {
        return jobRepository.findExecutionCandidateIds(now, staleBefore, firstPage(batchSize));
    }

    @Transactional
    public ClaimedPurgeJob claim(Long jobId, LocalDateTime now, LocalDateTime staleBefore) {
        WorkspacePurgeJob job = lockedJob(jobId);
        if (!job.claim(now, staleBefore)) return null;

        Map<WorkspacePurgeStore, WorkspacePurgeCheckpointStatus> checkpointStatuses =
                new EnumMap<>(WorkspacePurgeStore.class);
        checkpointRepository.findAllByPurgeJobIdOrderByStoreTypeAsc(jobId).stream()
                .forEach(
                        checkpoint ->
                                checkpointStatuses.put(
                                        checkpoint.getStoreType(), checkpoint.getStatus()));
        if (checkpointStatuses.size() != WorkspacePurgeStore.values().length) {
            job.fail("PURGE_CHECKPOINT_SET_INCOMPLETE", now);
            return null;
        }
        return new ClaimedPurgeJob(
                job.getId(), job.getWorkspaceId(), job.getAttemptCount(), checkpointStatuses);
    }

    @Transactional
    public void markCheckpointCompleted(
            Long jobId,
            int leaseVersion,
            WorkspacePurgeStore store,
            String summary,
            LocalDateTime now) {
        WorkspacePurgeJob job = lockedJob(jobId);
        requireLease(job, leaseVersion);
        WorkspacePurgeCheckpoint checkpoint = checkpoint(jobId, store);
        if (checkpoint.getStatus() != WorkspacePurgeCheckpointStatus.COMPLETED) {
            checkpoint.completed(summary, now);
        }
    }

    @Transactional
    public void markCheckpointFailed(
            Long jobId,
            int leaseVersion,
            WorkspacePurgeStore store,
            String errorCode,
            String summary,
            LocalDateTime now) {
        WorkspacePurgeJob job = lockedJob(jobId);
        if (!ownsLease(job, leaseVersion)) return;
        checkpoint(jobId, store).failed(errorCode, summary, now);
        job.fail(errorCode, now);
    }

    @Transactional
    public void renewLease(Long jobId, int leaseVersion, LocalDateTime now) {
        WorkspacePurgeJob job = lockedJob(jobId);
        requireLease(job, leaseVersion);
        job.heartbeat(now);
    }

    @Transactional
    public void markCompleted(Long jobId, int leaseVersion, LocalDateTime now) {
        WorkspacePurgeJob job = lockedJob(jobId);
        requireLease(job, leaseVersion);
        boolean allCompleted =
                checkpointRepository.findAllByPurgeJobIdOrderByStoreTypeAsc(jobId).stream()
                        .allMatch(
                                checkpoint ->
                                        checkpoint.getStatus()
                                                == WorkspacePurgeCheckpointStatus.COMPLETED);
        if (!allCompleted) {
            throw new IllegalStateException("All purge checkpoints must be completed first.");
        }
        job.complete(now);
    }

    private WorkspacePurgeJob lockedJob(Long jobId) {
        return jobRepository
                .findByIdForUpdate(jobId)
                .orElseThrow(() -> new IllegalStateException("Purge job no longer exists."));
    }

    private WorkspacePurgeCheckpoint checkpoint(Long jobId, WorkspacePurgeStore store) {
        return checkpointRepository
                .findByPurgeJobIdAndStoreType(jobId, store)
                .orElseThrow(() -> new IllegalStateException("Purge checkpoint no longer exists."));
    }

    private boolean ownsLease(WorkspacePurgeJob job, int leaseVersion) {
        return job.getStatus() == WorkspacePurgeJobStatus.PURGING
                && job.getAttemptCount() == leaseVersion;
    }

    private void requireLease(WorkspacePurgeJob job, int leaseVersion) {
        if (!ownsLease(job, leaseVersion)) {
            throw new IllegalStateException("Purge job lease is no longer owned by this Worker.");
        }
    }

    private PageRequest firstPage(int batchSize) {
        return PageRequest.of(0, Math.max(1, Math.min(batchSize, 100)));
    }

    public record ClaimedPurgeJob(
            Long jobId,
            Long workspaceId,
            int leaseVersion,
            Map<WorkspacePurgeStore, WorkspacePurgeCheckpointStatus> checkpointStatuses) {
        public ClaimedPurgeJob {
            checkpointStatuses = Map.copyOf(checkpointStatuses);
        }
    }
}
