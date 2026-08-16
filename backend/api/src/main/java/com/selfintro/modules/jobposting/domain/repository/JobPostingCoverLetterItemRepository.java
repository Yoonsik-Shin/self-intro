package com.selfintro.modules.jobposting.domain.repository;

import com.selfintro.modules.jobposting.domain.entity.JobPostingCoverLetterItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobPostingCoverLetterItemRepository
        extends JpaRepository<JobPostingCoverLetterItem, Long> {

    List<JobPostingCoverLetterItem> findAllByJobPostingIdOrderByDisplayOrderAsc(Long jobPostingId);

    List<JobPostingCoverLetterItem> findAllByWorkspaceJobApplicationIdOrderByDisplayOrderAsc(
            Long workspaceJobApplicationId);

    java.util.Optional<JobPostingCoverLetterItem> findByIdAndWorkspaceJobApplicationId(
            Long id, Long workspaceJobApplicationId);

    void deleteAllByJobPostingId(Long jobPostingId);

    void deleteAllByWorkspaceJobApplicationId(Long workspaceJobApplicationId);

    long countByJobPostingId(Long jobPostingId);

    /** 중복 공고 병합(백필) 전용. 승자 공고에 항목이 하나도 없을 때만 호출해야 한다(display_order 유니크 제약 충돌 방지). */
    @Modifying
    @Query(
            "UPDATE JobPostingCoverLetterItem c SET c.jobPostingId = :winnerId "
                    + "WHERE c.jobPostingId = :loserId")
    void reassignToWinner(@Param("loserId") Long loserId, @Param("winnerId") Long winnerId);
}
