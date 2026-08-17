package com.selfintro.modules.jobposting.domain.repository;

import com.selfintro.modules.jobposting.domain.entity.JobPostingPositionChoice;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobPostingPositionChoiceRepository
        extends JpaRepository<JobPostingPositionChoice, Long> {

    List<JobPostingPositionChoice> findByJobPostingIdOrderByRankOrderAsc(Long jobPostingId);

    List<JobPostingPositionChoice> findByJobPostingIdInOrderByRankOrderAsc(
            Collection<Long> jobPostingIds);

    void deleteByJobPostingId(Long jobPostingId);

    @Modifying
    @Query(
            "UPDATE JobPostingPositionChoice c SET c.jobPostingId = :winnerId WHERE c.jobPostingId = :loserId")
    void reassignToWinner(@Param("loserId") Long loserId, @Param("winnerId") Long winnerId);
}
