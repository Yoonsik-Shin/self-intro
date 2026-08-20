package com.selfintro.modules.competency.presentation.dto;

import com.selfintro.modules.competency.domain.entity.Competency;
import com.selfintro.modules.competency.domain.entity.CompetencyEvidence;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import com.selfintro.modules.study.domain.entity.Study;
import java.util.Comparator;
import java.util.List;

public record CompetencyResponse(
        Long id,
        String title,
        String summary,
        int displayOrder,
        boolean visible,
        List<SkillResponse> skills,
        List<TagResponse> tags,
        List<EvidenceResponse> evidences,
        List<StudyReferenceResponse> relatedStudies) {
    public static CompetencyResponse from(Competency competency) {
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
                        .map(StudyReferenceResponse::from)
                        .toList();
        return new CompetencyResponse(
                competency.getId(),
                competency.getTitle(),
                competency.getSummary(),
                competency.getDisplayOrder(),
                competency.isVisible(),
                competency.getSkillLinks().stream()
                        .map(link -> SkillResponse.fromCatalog(link.getSkill()))
                        .toList(),
                competency.getTags().stream()
                        .map(tag -> new TagResponse(tag.getId(), tag.getName(), tag.getSlug()))
                        .toList(),
                evidences,
                studies);
    }

    public record TagResponse(Long id, String name, String slug) {}

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

    public record StudyReferenceResponse(Long id, String slug, String title) {
        static StudyReferenceResponse from(Study study) {
            return new StudyReferenceResponse(study.getId(), study.getSlug(), study.getTitle());
        }
    }
}
