package com.selfintro.modules.identity.domain;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkspacePurgeJobRepository extends JpaRepository<WorkspacePurgeJob, Long> {
    Optional<WorkspacePurgeJob> findByWorkspaceId(Long workspaceId);

    List<WorkspacePurgeJob> findAllByOrderByCreatedAtDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select job from WorkspacePurgeJob job where job.id = :id")
    Optional<WorkspacePurgeJob> findByIdForUpdate(@Param("id") Long id);

    @Query(
            """
            select job.id from WorkspacePurgeJob job
            where job.eligibleAt <= :now
              and job.status in (
                com.selfintro.modules.identity.domain.WorkspacePurgeJobStatus.PENDING_GRACE,
                com.selfintro.modules.identity.domain.WorkspacePurgeJobStatus.BLOCKED,
                com.selfintro.modules.identity.domain.WorkspacePurgeJobStatus.READY,
                com.selfintro.modules.identity.domain.WorkspacePurgeJobStatus.FAILED
              )
            order by job.eligibleAt asc, job.id asc
            """)
    List<Long> findInspectionCandidateIds(@Param("now") LocalDateTime now, Pageable pageable);

    @Query(
            """
            select job.id from WorkspacePurgeJob job
            where job.eligibleAt <= :now
              and (
                job.status = com.selfintro.modules.identity.domain.WorkspacePurgeJobStatus.READY
                or (
                  job.status = com.selfintro.modules.identity.domain.WorkspacePurgeJobStatus.PURGING
                  and job.updatedAt < :staleBefore
                )
              )
            order by job.eligibleAt asc, job.id asc
            """)
    List<Long> findExecutionCandidateIds(
            @Param("now") LocalDateTime now,
            @Param("staleBefore") LocalDateTime staleBefore,
            Pageable pageable);
}
