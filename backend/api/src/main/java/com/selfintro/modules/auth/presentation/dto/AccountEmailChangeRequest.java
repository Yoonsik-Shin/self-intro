package com.selfintro.modules.auth.presentation.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AccountEmailChangeRequest(
        @NotBlank @Size(max = 200) String currentPassword,
        @NotBlank @Email @Size(max = 255) String newEmail) {}
