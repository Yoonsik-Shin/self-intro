package com.selfintro.modules.billing.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PointPackPurchaseRequest(
        @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{16,120}") String idempotencyKey) {}
