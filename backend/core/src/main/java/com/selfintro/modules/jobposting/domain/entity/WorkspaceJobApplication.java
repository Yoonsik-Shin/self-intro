package com.selfintro.modules.jobposting.domain.entity;

import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "workspace_job_application")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspaceJobApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workspace_id", nullable = false)
    private Long workspaceId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_posting_id", nullable = false)
    private JobPosting jobPosting;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private JobPostingStatus status;

    @Column(name = "applied_at")
    private LocalDate appliedAt;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Column(name = "interest_level")
    private Integer interestLevel;

    @Column(name = "match_score")
    private Integer matchScore;

    @Column(name = "match_reason", length = 500)
    private String matchReason;

    @Column(name = "appeal_analysis", columnDefinition = "TEXT")
    private String appealAnalysis;

    @Column(name = "appeal_analyzed_at")
    private LocalDateTime appealAnalyzedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "status_changed_at", nullable = false)
    private LocalDateTime statusChangedAt;

    public static WorkspaceJobApplication create(
            Long workspaceId,
            JobPosting jobPosting,
            JobPostingStatus status,
            LocalDate appliedAt,
            String memo,
            Integer interestLevel,
            LocalDateTime now) {
        WorkspaceJobApplication application = new WorkspaceJobApplication();
        application.workspaceId = workspaceId;
        application.jobPosting = jobPosting;
        application.status = status == null ? JobPostingStatus.SAVED : status;
        application.appliedAt = appliedAt;
        application.memo = memo;
        application.interestLevel = interestLevel;
        application.createdAt = now;
        application.updatedAt = now;
        application.statusChangedAt = now;
        return application;
    }

    public void updatePersonalState(
            String memo, Integer interestLevel, Integer matchScore, String matchReason) {
        this.memo = memo;
        this.interestLevel = interestLevel;
        this.matchScore = matchScore;
        this.matchReason = matchReason;
        this.updatedAt = LocalDateTime.now();
    }

    public void changeStatus(
            JobPostingStatus status, LocalDate appliedAt, LocalDateTime changedAt) {
        this.status = status;
        this.appliedAt = appliedAt;
        this.updatedAt = changedAt;
        this.statusChangedAt = changedAt;
    }

    public void applyAppealAnalysis(String analysis, LocalDateTime analyzedAt) {
        this.appealAnalysis = analysis;
        this.appealAnalyzedAt = analyzedAt;
        this.updatedAt = analyzedAt;
    }

    public void applyMatch(Integer score, String reason, LocalDateTime matchedAt) {
        this.matchScore = score;
        this.matchReason = reason;
        this.updatedAt = matchedAt;
    }
}
