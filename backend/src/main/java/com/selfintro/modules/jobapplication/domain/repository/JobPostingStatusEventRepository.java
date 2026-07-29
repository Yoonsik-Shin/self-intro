package com.selfintro.modules.jobapplication.domain.repository;

import com.selfintro.modules.jobapplication.domain.entity.JobPostingStatusEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobPostingStatusEventRepository
        extends JpaRepository<JobPostingStatusEvent, Long> {
    List<JobPostingStatusEvent> findByJobPostingIdOrderByChangedAtAsc(Long jobPostingId);
}
