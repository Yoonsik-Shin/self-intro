package com.selfintro.modules.competency.presentation.dto;

import com.selfintro.modules.competency.domain.Competency;
import com.selfintro.modules.competency.domain.CompetencyEvidence;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import com.selfintro.study.entity.Study;
import com.selfintro.study.entity.StudyStatus;
import java.util.Comparator;
import java.util.List;

public record CompetencyResponse(
        Long id,
        String title,
        String summary,
        int displayOrder,
        boolean visible,
        List<SkillResponse> skills,
        List<EvidenceResponse> evidences,
        List<StudyReferenceResponse> relatedStudies) {
    public static CompetencyResponse from(Competency competency, boolean publicOnly) {
        List<EvidenceResponse> evidences =
                competency.getEvidences().stream()
                        .sorted(
                                Comparator.comparing(CompetencyEvidence::isPrimary)
                                        .reversed()
                                        .thenComparingInt(CompetencyEvidence::getDisplayOrder))
                        .map(EvidenceResponse::from)
                        .toList();
        List<StudyReferenceResponse> studies =
                competency.getStudyLinks().stream()
                        .map(link -> link.getStudy())
                        .filter(study -> !publicOnly || study.getStatus() == StudyStatus.PUBLISHED)
                        .map(StudyReferenceResponse::from)
                        .toList();
        return new CompetencyResponse(
                competency.getId(),
                competency.getTitle(),
                competency.getSummary(),
                competency.getDisplayOrder(),
                competency.isVisible(),
                competency.getSkillLinks().stream()
                        .map(link -> SkillResponse.from(link.getSkill()))
                        .toList(),
                evidences,
                studies);
    }

    public record EvidenceResponse(
            Long id,
            Long experienceId,
            String experienceType,
            String experienceTitle,
            String evidenceSummary,
            boolean primary,
            int displayOrder) {
        static EvidenceResponse from(CompetencyEvidence evidence) {
            var experience = evidence.getExperience();
            String summary = evidence.getEvidenceSummary();
            if (summary == null || summary.isBlank()) {
                summary =
                        experience.getTakeaway() != null
                                ? experience.getTakeaway()
                                : experience.getSummary();
            }
            return new EvidenceResponse(
                    evidence.getId(),
                    experience.getId(),
                    experience.getType(),
                    experience.getTitle(),
                    summary,
                    evidence.isPrimary(),
                    evidence.getDisplayOrder());
        }
    }

    public record StudyReferenceResponse(Long id, String slug, String title, String status) {
        static StudyReferenceResponse from(Study study) {
            return new StudyReferenceResponse(
                    study.getId(), study.getSlug(), study.getTitle(), study.getStatus().name());
        }
    }
}
