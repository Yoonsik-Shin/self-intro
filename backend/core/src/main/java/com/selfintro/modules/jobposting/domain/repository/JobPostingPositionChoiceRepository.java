package com.selfintro.modules.jobposting.domain.repository;

import com.selfintro.modules.jobposting.domain.entity.JobPostingPositionChoice;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobPostingPositionChoiceRepository
        extends JpaRepository<JobPostingPositionChoice, Long> {

    List<JobPostingPositionChoice> findByJobPostingIdOrderByRankOrderAsc(Long jobPostingId);

    List<JobPostingPositionChoice> findByJobPostingIdInOrderByRankOrderAsc(
            Collection<Long> jobPostingIds);

    void deleteByJobPostingId(Long jobPostingId);
}
