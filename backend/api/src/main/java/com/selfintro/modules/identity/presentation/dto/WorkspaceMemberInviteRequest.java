package com.selfintro.modules.identity.presentation.dto;

import com.selfintro.modules.identity.domain.WorkspaceRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record WorkspaceMemberInviteRequest(
        @NotBlank @Email String email,
        @NotNull WorkspaceRole role,
        @Min(1) @Max(168) int validForHours) {}
