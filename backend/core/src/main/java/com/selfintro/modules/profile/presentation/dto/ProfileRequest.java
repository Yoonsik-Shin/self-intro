package com.selfintro.modules.profile.presentation.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProfileRequest(
        @NotBlank @Size(max = 60) String name,
        @NotBlank @Size(max = 60) String nameEn,
        @NotBlank @Size(max = 80) String jobTitle,
        @NotBlank @Size(max = 500) String bio,
        @NotBlank @Size(max = 120) String coreStackSummary,
        @NotBlank @Size(max = 160) String statusBadgeText,
        @NotBlank @Size(max = 255) String githubUrl,
        @NotBlank @Email @Size(max = 120) String email,
        @NotBlank @Size(max = 30) String phone) {}
