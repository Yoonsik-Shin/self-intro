package com.selfintro.modules.identity.presentation.dto;

import jakarta.validation.constraints.NotBlank;

public record WorkspaceClosureRequest(@NotBlank String workspaceName) {}
