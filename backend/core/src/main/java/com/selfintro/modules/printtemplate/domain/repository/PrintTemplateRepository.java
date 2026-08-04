package com.selfintro.modules.printtemplate.domain.repository;

import com.selfintro.modules.printtemplate.domain.entity.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PrintTemplateRepository extends JpaRepository<PrintTemplate, Long> {

    /**
     * document_type을 명시하지 않는 목록 조회는 이력서/포트폴리오 행이 한 테이블에 섞여 있어 위험하다.
     * 반드시 {@link #findAllByDocumentTypeAndVisibleTrueOrderByDisplayOrderAsc}처럼 document_type이
     * 붙은 쿼리만 새로 추가할 것 — 기존 두 메서드는 하위 호환을 위해 남겨두되 신규 코드에서 쓰지 않는다.
     */
    List<PrintTemplate> findAllByVisibleTrueOrderByDisplayOrderAsc();

    List<PrintTemplate> findAllByOrderByDisplayOrderAsc();

    List<PrintTemplate> findAllByDocumentTypeAndVisibleTrueOrderByDisplayOrderAsc(
            String documentType);

    List<PrintTemplate> findAllByDocumentTypeOrderByDisplayOrderAsc(String documentType);

    List<PrintTemplate> findAllByJobPostingIdOrderByDisplayOrderAsc(Long jobPostingId);

    List<PrintTemplate> findAllByJobPostingIdAndFinalSubmissionTrue(Long jobPostingId);

    long countByJobPostingId(Long jobPostingId);

    List<PrintTemplate> findAllByPortfolioCaseStudyIdOrderByOrientationAscDisplayOrderAsc(
            Long portfolioCaseStudyId);

    java.util.Optional<PrintTemplate> findByPortfolioCaseStudyIdAndOrientationAndVisibleTrue(
            Long portfolioCaseStudyId, String orientation);

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
