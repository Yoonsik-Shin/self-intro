package com.selfintro.modules.billing.presentation.dto;

import java.time.LocalDateTime;

public record WorkspaceBillingOverviewResponse(
        String planCode,
        String planName,
        int monthlyPriceKrw,
        int annualPriceKrw,
        int includedAiPoints,
        int availableAiPoints,
        int includedMembers,
        long activeMembers,
        int extraSeatMonthlyKrw,
        String subscriptionStatus,
        String billingCycle,
        LocalDateTime currentPeriodStart,
        LocalDateTime currentPeriodEnd,
        boolean cancelAtPeriodEnd,
        boolean pointEnforcementEnabled,
        String aiProvider,
        String aiRegion,
        String credentialMode,
        String consentPolicyVersion) {}
