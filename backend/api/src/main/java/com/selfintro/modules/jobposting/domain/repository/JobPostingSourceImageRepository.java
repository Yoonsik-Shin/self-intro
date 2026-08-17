package com.selfintro.modules.jobposting.domain.repository;

import com.selfintro.modules.jobposting.domain.entity.JobPostingSourceImage;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobPostingSourceImageRepository
        extends JpaRepository<JobPostingSourceImage, Long> {

    List<JobPostingSourceImage> findByJobPostingIdOrderByDisplayOrderAsc(Long jobPostingId);

    List<JobPostingSourceImage> findByJobPostingIdInOrderByDisplayOrderAsc(
            Collection<Long> jobPostingIds);

    void deleteByJobPostingId(Long jobPostingId);

    @Modifying
    @Query(
            "UPDATE JobPostingSourceImage i SET i.jobPostingId = :winnerId WHERE i.jobPostingId = :loserId")
    void reassignToWinner(@Param("loserId") Long loserId, @Param("winnerId") Long winnerId);
}
