package com.selfintro.modules.jobposting.presentation.dto;

import java.util.List;

public record JobPostingPrintDraftResponse(
        Long templateId,
        String templateName,
        String strategySummary,
        String targetRole,
        int includedCount,
        int excludedCount,
        List<Decision> decisions,
        List<String> warnings) {

    public record Decision(String itemType, String itemId, String decision, String reason) {}
}
