package com.selfintro.modules.billing.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BillingMethodConfirmRequest(
        @NotBlank @Size(max = 300) String authKey, @NotBlank @Size(max = 50) String customerKey) {}
