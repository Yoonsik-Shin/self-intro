package com.selfintro.modules.experiencetree.presentation.dto;

import com.selfintro.modules.experiencetree.domain.entity.*;
import com.selfintro.modules.experiencetree.domain.enums.*;
import com.selfintro.modules.study.domain.entity.Study;
import com.selfintro.modules.study.domain.enums.StudySection;
import java.time.LocalDate;
import java.util.List;

public final class ExperienceTreeResponse {
    private ExperienceTreeResponse() {}

    public record Index(
            String version, List<SituationSummary> situations, List<SituationRelation> relations) {}

    public record SituationSummary(
            String stableKey,
            String parentKey,
            DecisionDomain domain,
            String topic,
            String title,
            String summary,
            VerificationStatus verificationStatus,
            int optionCount,
            int warningCount,
            int studyCount,
            LocalDate verifiedAt,
            LocalDate nextReviewAt,
            int displayOrder) {}

    public record Detail(
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
            String contentHash,
            LocalDate verifiedAt,
            LocalDate nextReviewAt,
            List<Option> options,
            List<Warning> warnings,
            List<Source> sources,
            List<SituationRelation> relations,
            List<StudyLink> studies) {}

    public record SituationRelation(
            String sourceKey,
            String targetKey,
            DecisionSituationRelationType relationType,
            int displayOrder) {
        public static SituationRelation from(DecisionSituationRelation value) {
            return new SituationRelation(
                    value.getSource().getStableKey(),
                    value.getTarget().getStableKey(),
                    value.getRelationType(),
                    value.getDisplayOrder());
        }
    }

    public record Option(
            Long id,
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
            List<Tradeoff> tradeoffs) {
        public static Option from(DecisionOption value, List<DecisionTradeoff> tradeoffs) {
            return new Option(
                    value.getId(),
                    value.getStableKey(),
                    value.getTitle(),
                    value.getSummary(),
                    value.getMechanism(),
                    value.getApplicableWhen(),
                    value.getAvoidWhen(),
                    value.getAdvantages(),
                    value.getDisadvantages(),
                    value.getOperationalNotes(),
                    value.getDisplayOrder(),
                    tradeoffs.stream().map(Tradeoff::from).toList());
        }
    }

    public record Tradeoff(
            TradeoffCriterion criterion,
            TradeoffLevel level,
            String explanation,
            int displayOrder) {
        public static Tradeoff from(DecisionTradeoff value) {
            return new Tradeoff(
                    value.getCriterion(),
                    value.getLevel(),
                    value.getExplanation(),
                    value.getDisplayOrder());
        }
    }

    public record Warning(
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
            int displayOrder) {
        public static Warning from(DecisionWarning value) {
            return new Warning(
                    value.getStableKey(),
                    value.getOption() == null ? null : value.getOption().getStableKey(),
                    value.getClassification(),
                    value.getReasonType(),
                    value.getTitle(),
                    value.getDescription(),
                    value.getFailureCondition(),
                    value.getConsequence(),
                    value.getCorrection(),
                    value.getSeverity(),
                    value.getDisplayOrder());
        }
    }

    public record Source(
            String optionKey,
            String warningKey,
            DecisionSourceType sourceType,
            String title,
            String url,
            String publisher,
            String applicableVersion,
            LocalDate accessedAt,
            String note,
            int displayOrder) {
        public static Source from(DecisionSource value) {
            return new Source(
                    value.getOption() == null ? null : value.getOption().getStableKey(),
                    value.getWarning() == null ? null : value.getWarning().getStableKey(),
                    value.getSourceType(),
                    value.getTitle(),
                    value.getUrl(),
                    value.getPublisher(),
                    value.getApplicableVersion(),
                    value.getAccessedAt(),
                    value.getNote(),
                    value.getDisplayOrder());
        }
    }

    public record StudyLink(
            Long linkId,
            Long studyId,
            String slug,
            String title,
            String summary,
            StudySection section,
            DecisionStudyRelationType relationType,
            String optionKey,
            String note,
            LocalDate learnedAt,
            boolean managedByCatalog) {
        public static StudyLink from(DecisionStudyLink link) {
            Study study = link.getStudy();
            return new StudyLink(
                    link.getId(),
                    study.getId(),
                    study.getSlug(),
                    study.getTitle(),
                    study.getSummary(),
                    study.getSection(),
                    link.getRelationType(),
                    link.getOption() == null ? null : link.getOption().getStableKey(),
                    link.getNote(),
                    study.getLearnedAt(),
                    link.isManagedByCatalog());
        }
    }
}
