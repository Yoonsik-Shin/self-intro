package com.selfintro.modules.supportaccess.presentation.dto;

import com.selfintro.modules.supportaccess.domain.SupportAccessScope;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record SupportAccessCreateRequest(
        @NotBlank @Size(max = 120) String workspaceSlug,
        @NotBlank @Size(max = 500) String reason,
        @NotEmpty Set<SupportAccessScope> scopes,
        @Min(15) @Max(60) int durationMinutes) {}
