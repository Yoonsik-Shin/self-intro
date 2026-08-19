package com.selfintro.modules.profile.presentation.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ProfileRequest(
        @NotBlank @Size(max = 60) String name,
        @NotBlank @Size(max = 60) String nameEn,
        @Size(max = 80) String jobTitle,
        @NotBlank @Size(max = 500) String bio,
        @Size(max = 120) String coreStackSummary,
        @Size(max = 160) String statusBadgeText,
        @Size(max = 255)
                @Pattern(regexp = "^$|^https?://.+", message = "올바른 URL 형식이 아닙니다")
                String githubUrl,
        @Email @Size(max = 120) String email,
        @Size(max = 30)
                @Pattern(regexp = "^$|^0\\d{1,2}-?\\d{3,4}-?\\d{4}$", message = "올바른 전화번호 형식이 아닙니다")
                String phone,
        boolean publicEmail,
        boolean publicPhone) {}
