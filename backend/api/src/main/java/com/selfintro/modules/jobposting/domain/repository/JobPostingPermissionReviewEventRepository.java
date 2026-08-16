package com.selfintro.modules.jobposting.domain.repository;

import com.selfintro.modules.jobposting.domain.entity.JobPostingPermissionReviewEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobPostingPermissionReviewEventRepository
        extends JpaRepository<JobPostingPermissionReviewEvent, Long> {
    List<JobPostingPermissionReviewEvent> findByJobPostingIdOrderByReviewedAtDesc(
            Long jobPostingId);
}
