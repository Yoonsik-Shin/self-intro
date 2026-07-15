package com.selfintro.modules.experience.presentation.dto;

import com.selfintro.modules.experience.domain.*;
import com.selfintro.modules.skill.presentation.dto.SkillResponse;
import com.selfintro.study.entity.Tag;
import java.time.LocalDate;
import java.util.List;

public record ExperienceResponse(
    Long id,
    String type,
    String title,
    LocalDate periodStart,
    LocalDate periodEnd,
    String summary,
    String takeaway,
    String essayContent,
    int displayOrder,
    boolean showOnTimeline,
    String timelineLabel,
    List<ExperienceDetailResponse> details,
    List<SkillResponse> skills,
    List<TagResponse> tags,

    // Career
    String companyName,
    String employmentType,
    String department,
    String role,

    // Project
    String slug,
    Integer contributionRate,
    String repositoryUrl,

    // Education
    String institutionName,

    // Certificate
    String issuer
) {
    public static ExperienceResponse from(Experience exp) {
        List<ExperienceDetailResponse> detailResponses = exp.getDetails().stream()
            .map(ExperienceDetailResponse::from)
            .toList();
        List<SkillResponse> skillResponses = exp.getSkills().stream()
            .map(SkillResponse::from)
            .toList();
        List<TagResponse> tagResponses = exp.getTags().stream()
            .map(TagResponse::from)
            .toList();

        if (exp instanceof Career career) {
            return new ExperienceResponse(
                exp.getId(), exp.getType(), exp.getTitle(), exp.getPeriodStart(), exp.getPeriodEnd(),
                exp.getSummary(), exp.getTakeaway(), exp.getEssayContent(), exp.getDisplayOrder(),
                exp.isShowOnTimeline(), exp.getTimelineLabel(),
                detailResponses, skillResponses, tagResponses,
                career.getCompanyName(), career.getEmploymentType(), career.getDepartment(), career.getRole(),
                null, null, null, null, null
            );
        } else if (exp instanceof Project project) {
            return new ExperienceResponse(
                exp.getId(), exp.getType(), exp.getTitle(), exp.getPeriodStart(), exp.getPeriodEnd(),
                exp.getSummary(), exp.getTakeaway(), exp.getEssayContent(), exp.getDisplayOrder(),
                exp.isShowOnTimeline(), exp.getTimelineLabel(),
                detailResponses, skillResponses, tagResponses,
                null, null, null, project.getRole(),
                project.getSlug(), project.getContributionRate(), project.getRepositoryUrl(), null, null
            );
        } else if (exp instanceof Education edu) {
            return new ExperienceResponse(
                exp.getId(), exp.getType(), exp.getTitle(), exp.getPeriodStart(), exp.getPeriodEnd(),
                exp.getSummary(), exp.getTakeaway(), exp.getEssayContent(), exp.getDisplayOrder(),
                exp.isShowOnTimeline(), exp.getTimelineLabel(),
                detailResponses, skillResponses, tagResponses,
                null, null, null, null,
                null, null, null, edu.getInstitutionName(), null
            );
        } else if (exp instanceof Certificate cert) {
            return new ExperienceResponse(
                exp.getId(), exp.getType(), exp.getTitle(), exp.getPeriodStart(), exp.getPeriodEnd(),
                exp.getSummary(), exp.getTakeaway(), exp.getEssayContent(), exp.getDisplayOrder(),
                exp.isShowOnTimeline(), exp.getTimelineLabel(),
                detailResponses, skillResponses, tagResponses,
                null, null, null, null,
                null, null, null, null, cert.getIssuer()
            );
        }
        throw new IllegalArgumentException("지원하지 않는 이력 서브타입입니다.");
    }

    public record TagResponse(Long id, String name, String slug) {
        public static TagResponse from(Tag tag) {
            return new TagResponse(tag.getId(), tag.getName(), tag.getSlug());
        }
    }
}
