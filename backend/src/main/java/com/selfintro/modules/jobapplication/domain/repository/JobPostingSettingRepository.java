package com.selfintro.modules.jobapplication.domain.repository;

import com.selfintro.modules.jobapplication.domain.entity.JobPostingSetting;
import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobPostingSettingRepository extends JpaRepository<JobPostingSetting, Long> {

    default JobPostingSetting getOrCreateDefault() {
        return findById(JobPostingSetting.SINGLETON_ID)
                .orElseGet(() -> save(JobPostingSetting.defaults(LocalDateTime.now())));
    }
}
