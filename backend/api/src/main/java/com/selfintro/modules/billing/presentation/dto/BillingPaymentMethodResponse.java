package com.selfintro.modules.billing.presentation.dto;

public record BillingPaymentMethodResponse(
        Long id, String methodType, String issuerCode, String maskedNumber, String status) {}
