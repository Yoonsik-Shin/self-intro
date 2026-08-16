package com.selfintro.modules.experiencetree.application;

import com.selfintro.modules.experiencetree.domain.enums.DecisionSituationRelationType;
import com.selfintro.modules.experiencetree.domain.enums.DecisionStudyRelationType;
import java.util.List;
import java.util.Map;

public record ExperienceTreeTopologyDocument(
        Map<String, String> parents,
        List<RelationDocument> relations,
        List<StudyLinkDocument> studyLinks) {
    public record RelationDocument(
            String sourceKey,
            String targetKey,
            DecisionSituationRelationType relationType,
            int displayOrder) {}

    public record StudyLinkDocument(
            String seedKey,
            String situationKey,
            String optionKey,
            String studySlug,
            DecisionStudyRelationType relationType,
            String note,
            int displayOrder) {}
}
