package com.selfintro.modules.study.presentation.dto;

import com.selfintro.modules.experience.domain.entity.Experience;
import com.selfintro.modules.experience.domain.entity.ExperienceDetail;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import com.selfintro.modules.study.domain.entity.Study;
import com.selfintro.modules.study.domain.entity.StudyImage;
import com.selfintro.modules.study.domain.entity.StudyRelation;
import com.selfintro.modules.study.domain.entity.Tag;
import com.selfintro.modules.study.domain.enums.StudyRelationType;
import com.selfintro.modules.study.domain.enums.StudySection;
import com.selfintro.modules.study.domain.enums.StudyStatus;
import com.selfintro.modules.taxonomy.presentation.dto.TaxonomyNodeResponse;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

public record StudyResponse(
        Long id,
        String slug,
        String title,
        String summary,
        String contentMarkdown,
        StudyStatus status,
        StudySection section,
        List<TaxonomyNodeResponse> taxonomyNodes,
        List<TagResponse> tags,
        List<SkillResponse> skills,
        List<ExperienceReferenceResponse> experiences,
        List<ExperienceDetailReferenceResponse> experienceDetails,
        List<RelatedStudyResponse> relatedStudies,
        List<ImageResponse> images,
        LocalDate learnedAt,
        LocalDateTime publishedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
    public static StudyResponse from(Study study, Function<String, String> imageUrlResolver) {
        return new StudyResponse(
                study.getId(),
                study.getSlug(),
                study.getTitle(),
                study.getSummary(),
                study.getContentMarkdown(),
                study.getStatus(),
                study.getSection(),
                study.getTaxonomyNodes().stream().map(TaxonomyNodeResponse::from).toList(),
                study.getTags().stream().map(TagResponse::from).toList(),
                study.getSkills().stream().map(SkillResponse::from).toList(),
                study.getExperiences().stream().map(ExperienceReferenceResponse::from).toList(),
                study.getExperienceDetails().stream()
                        .map(ExperienceDetailReferenceResponse::from)
                        .toList(),
                study.getRelations().stream().map(RelatedStudyResponse::from).toList(),
                study.getImages().stream()
                        .map(image -> ImageResponse.from(image, imageUrlResolver))
                        .toList(),
                study.getLearnedAt(),
                study.getPublishedAt(),
                study.getCreatedAt(),
                study.getUpdatedAt());
    }

    public StudyResponse forPublication(Set<Long> selectedStudyIds, Set<Long> selectedTaxonomyIds) {
        return new StudyResponse(
                id,
                slug,
                title,
                summary,
                contentMarkdown,
                status,
                section,
                taxonomyNodes.stream()
                        .filter(node -> selectedTaxonomyIds.contains(node.id()))
                        .toList(),
                tags,
                skills,
                experiences,
                experienceDetails,
                relatedStudies.stream()
                        .filter(item -> selectedStudyIds.contains(item.id()))
                        .toList(),
                images,
                learnedAt,
                publishedAt,
                createdAt,
                updatedAt);
    }

    public record ImageResponse(Long id, String objectKey, String url, int displayOrder) {
        public static ImageResponse from(
                StudyImage image, Function<String, String> imageUrlResolver) {
            return new ImageResponse(
                    image.getId(),
                    image.getObjectKey(),
                    imageUrlResolver.apply(image.getObjectKey()),
                    image.getDisplayOrder());
        }
    }

    public record TagResponse(Long id, String name, String slug) {
        public static TagResponse from(Tag tag) {
            return new TagResponse(tag.getId(), tag.getName(), tag.getSlug());
        }
    }

    public record ExperienceReferenceResponse(Long id, String type, String title) {
        public static ExperienceReferenceResponse from(Experience experience) {
            return new ExperienceReferenceResponse(
                    experience.getId(), experience.getType(), experience.getTitle());
        }
    }

    public record ExperienceDetailReferenceResponse(
            Long id, String content, Long experienceId, String experienceTitle) {
        public static ExperienceDetailReferenceResponse from(ExperienceDetail detail) {
            return new ExperienceDetailReferenceResponse(
                    detail.getId(), detail.getContent(),
                    detail.getExperience().getId(), detail.getExperience().getTitle());
        }
    }

    public record RelatedStudyResponse(Long id, String slug, String title, StudyRelationType type) {
        public static RelatedStudyResponse from(StudyRelation relation) {
            Study target = relation.getTarget();
            return new RelatedStudyResponse(
                    target.getId(), target.getSlug(), target.getTitle(), relation.getType());
        }
    }
}
