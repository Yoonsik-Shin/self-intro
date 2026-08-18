package com.selfintro.modules.experiencetree.application;

import com.selfintro.modules.experiencetree.domain.enums.*;
import java.time.LocalDate;
import java.util.List;

public record ExperienceTreeDocument(
        String stableKey,
        String parentKey,
        DecisionDomain domain,
        String topic,
        String title,
        String summary,
        String problem,
        String contextMarkdown,
        String constraintsMarkdown,
        VerificationStatus verificationStatus,
        int contentVersion,
        LocalDate verifiedAt,
        LocalDate nextReviewAt,
        int displayOrder,
        List<OptionDocument> options,
        List<WarningDocument> warnings,
        List<SourceDocument> sources) {

    public record OptionDocument(
            String stableKey,
            String title,
            String summary,
            String mechanism,
            String applicableWhen,
            String avoidWhen,
            String advantages,
            String disadvantages,
            String operationalNotes,
            int displayOrder,
            List<TradeoffDocument> tradeoffs) {}

    public record TradeoffDocument(
            TradeoffCriterion criterion,
            TradeoffLevel level,
            String explanation,
            int displayOrder) {}

    public record WarningDocument(
            String stableKey,
            String optionKey,
            WarningClassification classification,
            WarningReasonType reasonType,
            String title,
            String description,
            String failureCondition,
            String consequence,
            String correction,
            WarningSeverity severity,
            int displayOrder) {}

    public record SourceDocument(
            String optionKey,
            String warningKey,
            DecisionSourceType sourceType,
            String title,
            String url,
            String publisher,
            String applicableVersion,
            LocalDate accessedAt,
            String note,
            int displayOrder) {}
}
