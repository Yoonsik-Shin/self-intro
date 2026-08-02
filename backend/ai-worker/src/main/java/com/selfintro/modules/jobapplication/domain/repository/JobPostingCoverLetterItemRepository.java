package com.selfintro.modules.jobapplication.domain.repository;

import com.selfintro.modules.jobapplication.domain.entity.JobPostingCoverLetterItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobPostingCoverLetterItemRepository
        extends JpaRepository<JobPostingCoverLetterItem, Long> {

    List<JobPostingCoverLetterItem> findAllByJobPostingIdOrderByDisplayOrderAsc(Long jobPostingId);

    void deleteAllByJobPostingId(Long jobPostingId);
}
