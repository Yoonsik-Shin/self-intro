package com.selfintro.modules.experience.presentation.dto;

import com.selfintro.modules.experience.domain.*;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import com.selfintro.study.entity.Tag;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

public record ExperienceResponse(
        Long id,
        String type,
        String title,
        LocalDate periodStart,
        LocalDate periodEnd,
        String summary,
        String takeaway,
        int displayOrder,
        boolean showOnTimeline,
        String timelineLabel,
        List<ExperienceDetailResponse> details,
        List<SkillResponse> skills,
        List<TagResponse> tags,
        List<ImageResponse> images,

        // Career
        String companyName,
        String employmentType,
        String department,
        String role,

        // Project
        String slug,
        Integer contributionRate,
        String repositoryUrl,
        Long careerId,

        // Education
        String institutionName,

        // Certificate
        String issuer) {
    public ExperienceResponse withSelectedDetails(List<Long> detailIds) {
        Set<Long> selectedIds = new HashSet<>(detailIds);
        return new ExperienceResponse(
                id,
                type,
                title,
                periodStart,
                periodEnd,
                summary,
                takeaway,
                displayOrder,
                showOnTimeline,
                timelineLabel,
                details.stream().filter(detail -> selectedIds.contains(detail.id())).toList(),
                skills,
                tags,
                images,
                companyName,
                employmentType,
                department,
                role,
                slug,
                contributionRate,
                repositoryUrl,
                careerId,
                institutionName,
                issuer);
    }

    public static ExperienceResponse from(
            Experience exp, Function<String, String> imageUrlResolver) {
        List<ExperienceDetailResponse> detailResponses =
                exp.getDetails().stream().map(ExperienceDetailResponse::from).toList();
        List<SkillResponse> skillResponses =
                exp.getSkills().stream().map(SkillResponse::from).toList();
        List<TagResponse> tagResponses = exp.getTags().stream().map(TagResponse::from).toList();
        List<ImageResponse> imageResponses =
                exp.getImages().stream()
                        .map(image -> ImageResponse.from(image, imageUrlResolver))
                        .toList();

        if (exp instanceof Career career) {
            return new ExperienceResponse(
                    exp.getId(),
                    exp.getType(),
                    exp.getTitle(),
                    exp.getPeriodStart(),
                    exp.getPeriodEnd(),
                    exp.getSummary(),
                    exp.getTakeaway(),
                    exp.getDisplayOrder(),
                    exp.isShowOnTimeline(),
                    exp.getTimelineLabel(),
                    detailResponses,
                    skillResponses,
                    tagResponses,
                    imageResponses,
                    career.getCompanyName(),
                    career.getEmploymentType(),
                    career.getDepartment(),
                    career.getRole(),
                    null,
                    null,
                    null,
                    null,
                    null,
                    null);
        } else if (exp instanceof Project project) {
            return new ExperienceResponse(
                    exp.getId(),
                    exp.getType(),
                    exp.getTitle(),
                    exp.getPeriodStart(),
                    exp.getPeriodEnd(),
                    exp.getSummary(),
                    exp.getTakeaway(),
                    exp.getDisplayOrder(),
                    exp.isShowOnTimeline(),
                    exp.getTimelineLabel(),
                    detailResponses,
                    skillResponses,
                    tagResponses,
                    imageResponses,
                    null,
                    null,
                    null,
                    project.getRole(),
                    project.getSlug(),
                    project.getContributionRate(),
                    project.getRepositoryUrl(),
                    project.getCareer() != null ? project.getCareer().getId() : null,
                    null,
                    null);
        } else if (exp instanceof Education edu) {
            return new ExperienceResponse(
                    exp.getId(),
                    exp.getType(),
                    exp.getTitle(),
                    exp.getPeriodStart(),
                    exp.getPeriodEnd(),
                    exp.getSummary(),
                    exp.getTakeaway(),
                    exp.getDisplayOrder(),
                    exp.isShowOnTimeline(),
                    exp.getTimelineLabel(),
                    detailResponses,
                    skillResponses,
                    tagResponses,
                    imageResponses,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    edu.getInstitutionName(),
                    null);
        } else if (exp instanceof Certificate cert) {
            return new ExperienceResponse(
                    exp.getId(),
                    exp.getType(),
                    exp.getTitle(),
                    exp.getPeriodStart(),
                    exp.getPeriodEnd(),
                    exp.getSummary(),
                    exp.getTakeaway(),
                    exp.getDisplayOrder(),
                    exp.isShowOnTimeline(),
                    exp.getTimelineLabel(),
                    detailResponses,
                    skillResponses,
                    tagResponses,
                    imageResponses,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    cert.getIssuer());
        }
        throw new IllegalArgumentException("지원하지 않는 이력 서브타입입니다.");
    }

    public record TagResponse(Long id, String name, String slug) {
        public static TagResponse from(Tag tag) {
            return new TagResponse(tag.getId(), tag.getName(), tag.getSlug());
        }
    }

    public record ImageResponse(Long id, String objectKey, String url, int displayOrder) {
        public static ImageResponse from(
                ExperienceImage image, Function<String, String> imageUrlResolver) {
            return new ImageResponse(
                    image.getId(),
                    image.getObjectKey(),
                    imageUrlResolver.apply(image.getObjectKey()),
                    image.getDisplayOrder());
        }
    }
}
