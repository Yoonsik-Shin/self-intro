package com.selfintro.modules.identity.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record WorkspaceNameChangeRequest(@NotBlank @Size(min = 2, max = 120) String name) {}
