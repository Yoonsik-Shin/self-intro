package com.selfintro.modules.printtemplate.presentation.dto;

import jakarta.validation.constraints.NotBlank;

public record DirectPdfUploadRequest(
        String name,
        @NotBlank String objectKey) {}
