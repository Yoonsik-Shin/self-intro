package com.selfintro.modules.jobapplication.domain.repository;

import com.selfintro.modules.jobapplication.domain.entity.JobPostingCandidate;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingCandidateStatus;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingSource;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobPostingCandidateRepository extends JpaRepository<JobPostingCandidate, Long> {

    boolean existsByUrl(String url);

    boolean existsBySourceAndExternalId(JobPostingSource source, String externalId);

    /**
     * 마감일이 지났다고 바로 숨기지 않는다 — 명시적으로 {@link JobPostingCandidate#markExpired}가 호출돼 EXPIRED 상태가 되기
     * 전까지는(= "지금 수집"/스케줄 정리가 한 번 돌기 전까지는) 목록에 그대로 보이고, 마감 여부는 프론트에서 D-day 배지로 표시한다.
     */
    List<JobPostingCandidate> findByStatusInOrderByFetchedAtDesc(
            Collection<JobPostingCandidateStatus> statuses);

    List<JobPostingCandidate> findByStatusInAndDeadlineBefore(
            Collection<JobPostingCandidateStatus> statuses, LocalDate deadline);
}
