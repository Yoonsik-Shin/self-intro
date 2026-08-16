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

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(
            "UPDATE JobPostingPositionChoice c SET c.jobPostingId = :winnerId WHERE c.jobPostingId = :loserId")
    void reassignToWinner(
            @org.springframework.data.repository.query.Param("loserId") Long loserId,
            @org.springframework.data.repository.query.Param("winnerId") Long winnerId);
}
