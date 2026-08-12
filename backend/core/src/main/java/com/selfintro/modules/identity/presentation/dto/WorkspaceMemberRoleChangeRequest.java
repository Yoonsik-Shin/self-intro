package com.selfintro.modules.identity.presentation.dto;

import com.selfintro.modules.identity.domain.WorkspaceRole;
import jakarta.validation.constraints.NotNull;

public record WorkspaceMemberRoleChangeRequest(@NotNull WorkspaceRole role) {}
