package com.selfintro.modules.skill.presentation.dto;

import com.selfintro.modules.skill.domain.enums.SkillReviewStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SkillProposalReviewRequest(
        @NotNull SkillReviewStatus reviewStatus, @Size(max = 500) String rejectionReason) {}
