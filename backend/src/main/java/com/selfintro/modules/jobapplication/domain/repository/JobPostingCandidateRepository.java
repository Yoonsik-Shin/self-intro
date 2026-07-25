package com.selfintro.modules.jobapplication.domain.repository;

import com.selfintro.modules.jobapplication.domain.entity.JobPostingCandidate;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingCandidateStatus;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingSource;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobPostingCandidateRepository extends JpaRepository<JobPostingCandidate, Long> {

    boolean existsByUrl(String url);

    boolean existsBySourceAndExternalId(JobPostingSource source, String externalId);

    @Query(
            "select c from JobPostingCandidate c "
                    + "where c.status in :statuses and (c.deadline is null or c.deadline >= :today) "
                    + "order by c.fetchedAt desc")
    List<JobPostingCandidate> findActiveByStatuses(
            @Param("statuses") Collection<JobPostingCandidateStatus> statuses,
            @Param("today") LocalDate today);

    List<JobPostingCandidate> findByStatusInAndDeadlineBefore(
            Collection<JobPostingCandidateStatus> statuses, LocalDate deadline);
}
