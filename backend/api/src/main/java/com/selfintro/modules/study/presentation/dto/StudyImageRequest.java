package com.selfintro.modules.study.presentation.dto;

import jakarta.validation.constraints.NotBlank;

public record StudyImageRequest(Long id, @NotBlank String objectKey, int displayOrder) {}
