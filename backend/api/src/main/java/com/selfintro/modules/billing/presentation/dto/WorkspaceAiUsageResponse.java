package com.selfintro.modules.billing.presentation.dto;

import java.time.LocalDateTime;
import java.util.List;

public record WorkspaceAiUsageResponse(List<Item> items) {

    public record Item(
            String usageId,
            String featureCode,
            String operationCode,
            String provider,
            String model,
            String status,
            String chargeOutcome,
            int estimatedPoints,
            int committedPoints,
            Long inputTokens,
            Long outputTokens,
            String failureCode,
            LocalDateTime startedAt,
            LocalDateTime completedAt) {}
}
