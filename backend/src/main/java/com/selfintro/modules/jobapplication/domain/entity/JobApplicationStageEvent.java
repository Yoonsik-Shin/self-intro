package com.selfintro.modules.jobapplication.domain.entity;

import com.selfintro.modules.jobapplication.domain.enums.JobApplicationStage;
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

/** 전형 단계 변화의 append-only 이력. 생성 후 수정/삭제하지 않는다. */
@Getter
@Entity
@Table(name = "job_application_stage_event")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobApplicationStageEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_application_id", nullable = false, updatable = false)
    private Long jobApplicationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "stage", nullable = false, updatable = false, length = 30)
    private JobApplicationStage stage;

    @Column(name = "memo", updatable = false, length = 1000)
    private String memo;

    @Column(name = "changed_at", nullable = false, updatable = false)
    private LocalDateTime changedAt;

    private JobApplicationStageEvent(
            Long jobApplicationId,
            JobApplicationStage stage,
            String memo,
            LocalDateTime changedAt) {
        this.jobApplicationId = jobApplicationId;
        this.stage = stage;
        this.memo = memo;
        this.changedAt = changedAt;
    }

    public static JobApplicationStageEvent of(
            Long jobApplicationId,
            JobApplicationStage stage,
            String memo,
            LocalDateTime changedAt) {
        return new JobApplicationStageEvent(jobApplicationId, stage, memo, changedAt);
    }
}
