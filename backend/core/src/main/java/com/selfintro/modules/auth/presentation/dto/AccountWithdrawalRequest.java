package com.selfintro.modules.auth.presentation.dto;

import jakarta.validation.constraints.NotBlank;

public record AccountWithdrawalRequest(@NotBlank String confirmation) {}
