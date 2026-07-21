package com.selfintro.study.dto;

import jakarta.validation.constraints.NotBlank;

public record StudyImageRequest(Long id, @NotBlank String objectKey, int displayOrder) {}
