package com.selfintro.modules.jobapplication.domain.repository;

import com.selfintro.modules.jobapplication.domain.entity.JobPosting;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingSource;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingStatus;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobPostingRepository extends JpaRepository<JobPosting, Long> {

    boolean existsByPostingUrl(String postingUrl);

    boolean existsByCollectionMethodAndExternalId(
            JobPostingSource collectionMethod, String externalId);

    /** 플랫폼 간 중복 병합의 매칭 키. 정규화된 회사명+직무명이 완전일치하면 같은 공고로 본다. */
    Optional<JobPosting> findByCompanyNameNormalizedAndPositionTitleNormalized(
            String companyNameNormalized, String positionTitleNormalized);

    /**
     * 마감일이 지났다고 바로 숨기지 않는다 — 명시적으로 {@link JobPosting#markExpired}가 호출돼 EXPIRED 상태가 되기 전까지는(= "지금
     * 수집"/스케줄 정리가 한 번 돌기 전까지는) 목록에 그대로 보이고, 마감 여부는 프론트에서 D-day 배지로 표시한다. EXPIRED만 전체 목록에서 제외한다 — 지원
     * 후 상태에는 해당하지 않는 값이라 항상 안전하다.
     */
    List<JobPosting> findByStatusNotOrderByCreatedAtDesc(JobPostingStatus excludedStatus);

    List<JobPosting> findByStatusInAndDeadlineBefore(
            Collection<JobPostingStatus> statuses, LocalDate deadline);
}
