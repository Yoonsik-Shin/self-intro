package com.selfintro.modules.storage.presentation.dto;

import com.selfintro.modules.storage.application.ImageScope;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PresignedUploadRequest(
        @NotNull ImageScope scope, @NotBlank String fileName, @NotBlank String contentType) {}
