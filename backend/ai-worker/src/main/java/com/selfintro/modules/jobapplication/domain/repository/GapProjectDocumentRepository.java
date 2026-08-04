package com.selfintro.modules.jobapplication.domain.repository;

import com.selfintro.modules.jobapplication.domain.entity.GapProjectDocument;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GapProjectDocumentRepository extends JpaRepository<GapProjectDocument, Long> {
    List<GapProjectDocument> findAllByJobPostingIdOrderByVersionDesc(Long jobPostingId);

    long countByJobPostingId(Long jobPostingId);

    /** 중복 공고 병합(백필) 전용. 승자 공고에 문서가 하나도 없을 때만 호출해야 한다(version 유니크 제약 충돌 방지). */
    @Modifying
    @Query(
            "UPDATE GapProjectDocument d SET d.jobPostingId = :winnerId "
                    + "WHERE d.jobPostingId = :loserId")
    void reassignToWinner(@Param("loserId") Long loserId, @Param("winnerId") Long winnerId);
}
