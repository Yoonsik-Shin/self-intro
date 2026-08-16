package com.selfintro.modules.identity.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record WorkspaceSlugChangeRequest(@NotBlank @Size(min = 3, max = 60) String slug) {}
