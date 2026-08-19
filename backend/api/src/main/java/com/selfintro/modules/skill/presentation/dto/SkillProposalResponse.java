package com.selfintro.modules.skill.presentation.dto;

import com.selfintro.modules.skill.domain.entity.SkillProposal;
import com.selfintro.modules.skill.domain.enums.SkillReviewStatus;
import java.time.LocalDateTime;

public record SkillProposalResponse(
        Long id,
        Long workspaceId,
        String workspaceName,
        String workspaceSlug,
        String name,
        String category,
        String skillLevel,
        String skillVersion,
        String comment,
        String usageType,
        String badgeKey,
        String badgeColor,
        boolean isCore,
        int displayOrder,
        SkillReviewStatus reviewStatus,
        String rejectionReason,
        LocalDateTime reviewedAt,
        LocalDateTime createdAt) {
    public static SkillProposalResponse from(SkillProposal proposal) {
        return from(proposal, null, null);
    }

    public static SkillProposalResponse from(
            SkillProposal proposal, String workspaceName, String workspaceSlug) {
        return new SkillProposalResponse(
                proposal.getId(),
                proposal.getWorkspaceId(),
                workspaceName,
                workspaceSlug,
                proposal.getName(),
                proposal.getCategory(),
                proposal.getSkillLevel(),
                proposal.getSkillVersion(),
                proposal.getComment(),
                proposal.getUsageType(),
                proposal.getBadgeKey(),
                proposal.getBadgeColor(),
                proposal.isCore(),
                proposal.getDisplayOrder(),
                proposal.getReviewStatus(),
                proposal.getRejectionReason(),
                proposal.getReviewedAt(),
                proposal.getCreatedAt());
    }
}
