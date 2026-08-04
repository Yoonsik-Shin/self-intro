package com.selfintro.modules.jobapplication.domain.repository;

import com.selfintro.modules.jobapplication.domain.entity.JobPostingSourceUrl;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobPostingSourceUrlRepository extends JpaRepository<JobPostingSourceUrl, Long> {

    boolean existsByUrl(String url);

    List<JobPostingSourceUrl> findByJobPostingIdOrderByPrimaryDescCreatedAtAsc(Long jobPostingId);

    List<JobPostingSourceUrl> findByJobPostingIdInOrderByPrimaryDescCreatedAtAsc(
            Collection<Long> jobPostingIds);

    /** 공고 수동 편집에서 대표 URL 자체를 바꿀 때, 기존 대표 출처 행을 지우고 새로 등록하기 위해 쓴다. */
    void deleteByJobPostingIdAndPrimaryTrue(Long jobPostingId);

    /** 백필 중복 병합: 패자 공고의 모든 URL을 승자 공고로 옮기되, 승자 자신의 대표 URL과 겹치지 않게 non-primary로 통일한다. */
    @Modifying
    @Query(
            "UPDATE JobPostingSourceUrl s SET s.jobPostingId = :winnerId, s.primary = false "
                    + "WHERE s.jobPostingId = :loserId")
    void reassignToWinner(@Param("loserId") Long loserId, @Param("winnerId") Long winnerId);
}
