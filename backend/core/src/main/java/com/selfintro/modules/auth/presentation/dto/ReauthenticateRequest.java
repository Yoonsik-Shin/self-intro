package com.selfintro.modules.auth.presentation.dto;

import jakarta.validation.constraints.NotBlank;

public record ReauthenticateRequest(@NotBlank String password) {}
