package com.selfintro.modules.jobposting.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 한 공고(job_posting)에 직무가 여러 개 나열된 경우(예: 채용관 공고) 2지망 이상을 표현한다.
 * 1지망은 job_posting.position_title이 dedup 정체성 키로 계속 담당하고, 이 테이블은
 * rank_order 2 이상만 저장한다.
 */
@Getter
@Entity
@Table(name = "job_posting_position_choice")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobPostingPositionChoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_posting_id", nullable = false, updatable = false)
    private Long jobPostingId;

    @Column(name = "rank_order", nullable = false, updatable = false)
    private int rankOrder;

    @Column(name = "position_title", nullable = false, updatable = false, length = 150)
    private String positionTitle;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private JobPostingPositionChoice(
            Long jobPostingId, int rankOrder, String positionTitle, LocalDateTime now) {
        this.jobPostingId = jobPostingId;
        this.rankOrder = rankOrder;
        this.positionTitle = positionTitle;
        this.createdAt = now;
    }

    public static JobPostingPositionChoice of(
            Long jobPostingId, int rankOrder, String positionTitle, LocalDateTime now) {
        return new JobPostingPositionChoice(jobPostingId, rankOrder, positionTitle, now);
    }
}
