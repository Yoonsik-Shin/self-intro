package com.selfintro.modules.skill.domain.entity;

import com.selfintro.modules.skill.domain.enums.SkillReviewStatus;
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
 * Workspace 사용자가 공통 카탈로그에 없는 기술을 제안한 기록이다. 승인되기 전까지는 {@code skill}
 * 테이블에 어떤 흔적도 남기지 않는다 — 그 테이블은 BFF가 캐싱하는 원본이라 검토 전/반려 항목이 섞이면 안 된다.
 */
@Getter
@Entity
@Table(name = "skill_proposal")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SkillProposal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workspace_id", nullable = false)
    private Long workspaceId;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(name = "skill_level", length = 40)
    private String skillLevel;

    @Column(name = "skill_version", length = 60)
    private String skillVersion;

    @Column(name = "skill_comment", length = 500)
    private String comment;

    @Column(name = "usage_type", nullable = false, length = 30)
    private String usageType;

    @Column(name = "badge_key", length = 80)
    private String badgeKey;

    @Column(name = "badge_color", length = 6)
    private String badgeColor;

    @Column(name = "is_core", nullable = false)
    private boolean core;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", nullable = false, length = 20)
    private SkillReviewStatus reviewStatus;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "reviewed_by_user_id")
    private Long reviewedByUserId;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "approved_skill_id")
    private Long approvedSkillId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static SkillProposal propose(
            Long workspaceId,
            String name,
            String category,
            String skillLevel,
            String skillVersion,
            String comment,
            String usageType,
            String badgeKey,
            String badgeColor,
            boolean core,
            int displayOrder) {
        SkillProposal proposal = new SkillProposal();
        proposal.workspaceId = workspaceId;
        proposal.name = name;
        proposal.category = category;
        proposal.skillLevel = skillLevel;
        proposal.skillVersion = skillVersion;
        proposal.comment = comment;
        proposal.usageType = usageType == null || usageType.isBlank() ? "LEARNING" : usageType;
        proposal.badgeKey = badgeKey;
        proposal.badgeColor = badgeColor;
        proposal.core = core;
        proposal.displayOrder = displayOrder;
        proposal.reviewStatus = SkillReviewStatus.PENDING_REVIEW;
        LocalDateTime now = LocalDateTime.now();
        proposal.createdAt = now;
        proposal.updatedAt = now;
        return proposal;
    }

    public void approve(Long reviewerUserId, Long approvedSkillId) {
        this.reviewStatus = SkillReviewStatus.APPROVED;
        this.approvedSkillId = approvedSkillId;
        this.rejectionReason = null;
        this.reviewedByUserId = reviewerUserId;
        this.reviewedAt = LocalDateTime.now();
        this.updatedAt = this.reviewedAt;
    }

    public void reject(Long reviewerUserId, String rejectionReason) {
        this.reviewStatus = SkillReviewStatus.REJECTED;
        this.rejectionReason = rejectionReason;
        this.reviewedByUserId = reviewerUserId;
        this.reviewedAt = LocalDateTime.now();
        this.updatedAt = this.reviewedAt;
    }
}
