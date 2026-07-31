package com.selfintro.modules.printtemplate.presentation.dto;

import jakarta.validation.constraints.NotBlank;

public record PrintTemplateFinalPdfRequest(@NotBlank String objectKey) {}
