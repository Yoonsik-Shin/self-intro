package com.selfintro.modules.jobposting.domain.repository;

import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionReviewStatus;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface JobPostingRepositoryCustom {

    Page<JobPosting> findSharedCatalog(String keyword, LocalDateTime now, Pageable pageable);

    Page<JobPosting> findAdminPostings(
            String keyword,
            JobPostingPermissionReviewStatus reviewStatus,
            Pageable pageable);
}
