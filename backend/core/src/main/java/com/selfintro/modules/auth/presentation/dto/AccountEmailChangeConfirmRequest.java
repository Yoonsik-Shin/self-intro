package com.selfintro.modules.auth.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AccountEmailChangeConfirmRequest(@NotBlank @Size(max = 200) String token) {}
