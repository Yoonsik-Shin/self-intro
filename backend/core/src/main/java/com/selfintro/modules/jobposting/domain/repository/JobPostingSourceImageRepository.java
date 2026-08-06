package com.selfintro.modules.jobposting.domain.repository;

import com.selfintro.modules.jobposting.domain.entity.JobPostingSourceImage;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobPostingSourceImageRepository
        extends JpaRepository<JobPostingSourceImage, Long> {

    List<JobPostingSourceImage> findByJobPostingIdOrderByDisplayOrderAsc(Long jobPostingId);

    List<JobPostingSourceImage> findByJobPostingIdInOrderByDisplayOrderAsc(
            Collection<Long> jobPostingIds);

    void deleteByJobPostingId(Long jobPostingId);
}
