package com.selfintro.modules.experience.presentation.dto;

import jakarta.validation.constraints.NotBlank;

public record ExperienceImageRequest(
    Long id, // null이면 신규 업로드, 있으면 기존 이미지의 순서만 갱신
    @NotBlank String objectKey,
    int displayOrder
) {}
