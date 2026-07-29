package com.selfintro.modules.jobapplication.domain.entity;

import com.selfintro.modules.jobapplication.domain.enums.JobPostingStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 공고 상태 변화의 append-only 이력. 지원 전(저장/제외)부터 지원 후 전형 단계까지 한 공고의 전 생애주기를 하나의 타임라인으로 기록한다. 생성 후 수정/삭제하지
 * 않는다.
 */
@Getter
@Entity
@Table(name = "job_posting_status_event")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobPostingStatusEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_posting_id", nullable = false, updatable = false)
    private Long jobPostingId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, updatable = false, length = 30)
    private JobPostingStatus status;

    @Column(name = "memo", updatable = false, length = 1000)
    private String memo;

    @Column(name = "changed_at", nullable = false, updatable = false)
    private LocalDateTime changedAt;

    private JobPostingStatusEvent(
            Long jobPostingId, JobPostingStatus status, String memo, LocalDateTime changedAt) {
        this.jobPostingId = jobPostingId;
        this.status = status;
        this.memo = memo;
        this.changedAt = changedAt;
    }

    public static JobPostingStatusEvent of(
            Long jobPostingId, JobPostingStatus status, String memo, LocalDateTime changedAt) {
        return new JobPostingStatusEvent(jobPostingId, status, memo, changedAt);
    }
}
