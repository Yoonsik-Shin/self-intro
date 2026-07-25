package com.selfintro.modules.jobapplication.domain.repository;

import com.selfintro.modules.jobapplication.domain.entity.JobApplicationStageEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobApplicationStageEventRepository
        extends JpaRepository<JobApplicationStageEvent, Long> {
    List<JobApplicationStageEvent> findByJobApplicationIdOrderByChangedAtAsc(Long jobApplicationId);
}
