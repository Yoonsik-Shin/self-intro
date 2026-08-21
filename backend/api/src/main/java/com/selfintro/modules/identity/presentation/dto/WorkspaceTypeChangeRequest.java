package com.selfintro.modules.identity.presentation.dto;

import com.selfintro.modules.identity.domain.WorkspaceType;
import jakarta.validation.constraints.NotNull;

public record WorkspaceTypeChangeRequest(@NotNull WorkspaceType type) {}
