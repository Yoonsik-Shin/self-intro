package com.selfintro.portfolio.presentation.dto;

import java.util.List;

public record PortfolioPrintDraftResponse(
        Long templateId,
        String templateName,
        String strategySummary,
        int includedCount,
        int excludedCount,
        List<Decision> decisions,
        List<String> warnings) {

    public record Decision(String itemType, String itemId, String decision, String reason) {}
}
