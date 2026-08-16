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

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(
            "UPDATE JobPostingSourceImage i SET i.jobPostingId = :winnerId WHERE i.jobPostingId = :loserId")
    void reassignToWinner(
            @org.springframework.data.repository.query.Param("loserId") Long loserId,
            @org.springframework.data.repository.query.Param("winnerId") Long winnerId);
}
