package com.selfintro.modules.billing.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record SubscriptionPurchaseRequest(
        @NotBlank @Pattern(regexp = "PERSONAL_PRO|BUSINESS") String planCode,
        @NotBlank @Pattern(regexp = "MONTHLY|ANNUAL") String billingCycle,
        @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{16,120}") String idempotencyKey) {}
