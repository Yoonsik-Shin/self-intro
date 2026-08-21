package com.selfintro.modules.billing.presentation.dto;

public record BillingCheckoutContextResponse(
        boolean enabled, String provider, String clientKey, String customerKey) {}
