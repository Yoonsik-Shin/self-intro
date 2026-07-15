package com.selfintro.study.dto;

import com.selfintro.modules.experience.domain.Experience;
import com.selfintro.modules.experience.domain.ExperienceDetail;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import com.selfintro.study.entity.Study;
import com.selfintro.study.entity.StudyRelation;
import com.selfintro.study.entity.StudyRelationType;
import com.selfintro.study.entity.StudyStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record StudyResponse(
        Long id,
        String slug,
        String title,
        String summary,
        String contentMarkdown,
        StudyStatus status,
        CategoryResponse category,
        List<TagResponse> tags,
        List<SkillResponse> skills,
        List<ExperienceReferenceResponse> experiences,
        List<ExperienceDetailReferenceResponse> experienceDetails,
        List<RelatedStudyResponse> relatedStudies,
        LocalDate learnedAt,
        LocalDateTime publishedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static StudyResponse from(Study study) {
        return new StudyResponse(
                study.getId(),
                study.getSlug(),
                study.getTitle(),
                study.getSummary(),
                study.getContentMarkdown(),
                study.getStatus(),
                CategoryResponse.from(study.getCategory()),
                study.getTags().stream().map(TagResponse::from).toList(),
                study.getSkills().stream().map(SkillResponse::from).toList(),
                study.getExperiences().stream().map(ExperienceReferenceResponse::from).toList(),
                study.getExperienceDetails().stream().map(ExperienceDetailReferenceResponse::from).toList(),
                study.getRelations().stream().map(RelatedStudyResponse::from).toList(),
                study.getLearnedAt(),
                study.getPublishedAt(),
                study.getCreatedAt(),
                study.getUpdatedAt());
    }

    public record CategoryResponse(Long id, String name, String slug, int displayOrder) {
        public static CategoryResponse from(com.selfintro.study.entity.StudyCategory category) {
            return new CategoryResponse(category.getId(), category.getName(), category.getSlug(), category.getDisplayOrder());
        }
    }

    public record TagResponse(Long id, String name, String slug) {
        public static TagResponse from(com.selfintro.study.entity.Tag tag) {
            return new TagResponse(tag.getId(), tag.getName(), tag.getSlug());
        }
    }

    public record ExperienceReferenceResponse(Long id, String type, String title) {
        public static ExperienceReferenceResponse from(Experience experience) {
            return new ExperienceReferenceResponse(experience.getId(), experience.getType(), experience.getTitle());
        }
    }

    public record ExperienceDetailReferenceResponse(Long id, String content, Long experienceId, String experienceTitle) {
        public static ExperienceDetailReferenceResponse from(ExperienceDetail detail) {
            return new ExperienceDetailReferenceResponse(
                    detail.getId(), detail.getContent(),
                    detail.getExperience().getId(), detail.getExperience().getTitle());
        }
    }

    public record RelatedStudyResponse(Long id, String slug, String title, StudyRelationType type) {
        public static RelatedStudyResponse from(StudyRelation relation) {
            Study target = relation.getTarget();
            return new RelatedStudyResponse(target.getId(), target.getSlug(), target.getTitle(), relation.getType());
        }
    }
}
