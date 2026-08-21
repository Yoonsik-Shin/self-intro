package com.selfintro.modules.aiusage.application;

import java.math.BigDecimal;

public record AiUsageResult(
        String provider,
        String model,
        String region,
        long inputTokens,
        long cachedInputTokens,
        long outputTokens,
        int retryCount,
        int actualPoints,
        BigDecimal providerCostUsd,
        BigDecimal providerCostKrw,
        String priceVersion,
        String evidenceSnapshotHash) {

    public static AiUsageResult estimated(int actualPoints) {
        return new AiUsageResult(
                null, null, null, 0, 0, 0, 0, actualPoints, null, null, null, null);
    }
}
