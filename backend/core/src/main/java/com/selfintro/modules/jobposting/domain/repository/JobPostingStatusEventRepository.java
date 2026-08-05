package com.selfintro.modules.jobposting.domain.repository;

import com.selfintro.modules.jobposting.domain.entity.JobPostingStatusEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobPostingStatusEventRepository
        extends JpaRepository<JobPostingStatusEvent, Long> {
    List<JobPostingStatusEvent> findByJobPostingIdOrderByChangedAtAsc(Long jobPostingId);

    /** 중복 공고 병합(백필)에서 패자 공고의 상태 이력을 승자 공고로 옮긴다. */
    @Modifying
    @Query(
            "UPDATE JobPostingStatusEvent e SET e.jobPostingId = :winnerId "
                    + "WHERE e.jobPostingId = :loserId")
    void reassignToWinner(@Param("loserId") Long loserId, @Param("winnerId") Long winnerId);
}
