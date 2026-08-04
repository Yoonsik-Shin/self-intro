package com.selfintro.modules.printtemplate.domain.repository;

import com.selfintro.modules.printtemplate.domain.entity.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PrintTemplateRepository extends JpaRepository<PrintTemplate, Long> {

    List<PrintTemplate> findAllByVisibleTrueOrderByDisplayOrderAsc();

    List<PrintTemplate> findAllByOrderByDisplayOrderAsc();

    List<PrintTemplate> findAllByJobPostingIdOrderByDisplayOrderAsc(Long jobPostingId);

    List<PrintTemplate> findAllByJobPostingIdAndFinalSubmissionTrue(Long jobPostingId);

    long countByJobPostingId(Long jobPostingId);

    /**
     * 중복 채용공고 병합(백필) 전용. 인쇄 템플릿이 연동하던 공고 행이 다른 승자 행으로 합쳐질 때, finalSubmission 등 다른 필드는 건드리지 않고
     * job_posting_id만 옮긴다.
     */
    @Modifying
    @Query(
            "UPDATE PrintTemplate p SET p.jobPostingId = :winnerId "
                    + "WHERE p.jobPostingId = :loserId")
    void reassignToWinner(@Param("loserId") Long loserId, @Param("winnerId") Long winnerId);
}
