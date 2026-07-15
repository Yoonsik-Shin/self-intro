package com.selfintro.modules.experience.presentation.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

public record ExperienceRequest(
    @NotBlank String type, // "CAREER", "PROJECT", "EDUCATION", "CERTIFICATE"
    @NotBlank @Size(max = 150) String title,
    @NotNull LocalDate periodStart,
    LocalDate periodEnd,
    @Size(max = 300) String summary,
    @Size(max = 500) String takeaway,
    String essayContent,
    int displayOrder,
    List<ExperienceDetailRequest> details, // Bullet points with per-item detail content
    List<Long> skillIds,  // Mapping to Skill entities
    List<@NotBlank @Size(max = 80) String> tagNames,
    boolean showOnTimeline,
    @Size(max = 60) String timelineLabel,

    // Career specific fields
    String companyName,
    String employmentType,
    String department,
    String role,

    // Project specific fields
    String slug,
    Integer contributionRate,
    @Size(max = 500)
    @Pattern(regexp = "^$|https?://\\S+$", message = "repositoryUrl은 http 또는 https URL이어야 합니다.")
    String repositoryUrl,

    // Education specific fields
    String institutionName,

    // Certificate specific fields
    String issuer
) {}
