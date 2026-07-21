package com.selfintro.modules.experience.domain;

import com.selfintro.modules.skill.domain.Skill;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "project")
@PrimaryKeyJoinColumn(name = "experience_id")
@DiscriminatorValue("PROJECT")
public class Project extends Experience {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "career_experience_id")
    private Career career;

    @Column(nullable = false, length = 40)
    private String slug;

    @Column(nullable = false, length = 80)
    private String role;

    @Column(name = "contribution_rate")
    private Integer contributionRate;

    @Column(name = "repository_url", length = 500)
    private String repositoryUrl;

    protected Project() {
        // JPA standard constructor
    }

    private Project(
            String title,
            LocalDate periodStart,
            LocalDate periodEnd,
            String summary,
            String takeaway,
            int displayOrder,
            List<ExperienceDetail.Draft> details,
            List<Skill> skills,
            boolean showOnTimeline,
            String timelineLabel,
            String slug,
            String role,
            Integer contributionRate,
            String repositoryUrl,
            Career career) {
        super(
                title,
                periodStart,
                periodEnd,
                summary,
                takeaway,
                displayOrder,
                details,
                skills,
                showOnTimeline,
                timelineLabel);
        this.career = career;
        this.slug = slug;
        this.role = role;
        this.contributionRate = contributionRate;
        this.repositoryUrl = repositoryUrl;
    }

    public static Project create(
            String title,
            LocalDate periodStart,
            LocalDate periodEnd,
            String summary,
            String takeaway,
            int displayOrder,
            List<ExperienceDetail.Draft> details,
            List<Skill> skills,
            boolean showOnTimeline,
            String timelineLabel,
            String slug,
            String role,
            Integer contributionRate) {
        return create(
                title,
                periodStart,
                periodEnd,
                summary,
                takeaway,
                displayOrder,
                details,
                skills,
                showOnTimeline,
                timelineLabel,
                slug,
                role,
                contributionRate,
                null);
    }

    public static Project create(
            String title,
            LocalDate periodStart,
            LocalDate periodEnd,
            String summary,
            String takeaway,
            int displayOrder,
            List<ExperienceDetail.Draft> details,
            List<Skill> skills,
            boolean showOnTimeline,
            String timelineLabel,
            String slug,
            String role,
            Integer contributionRate,
            String repositoryUrl) {
        return create(
                title,
                periodStart,
                periodEnd,
                summary,
                takeaway,
                displayOrder,
                details,
                skills,
                showOnTimeline,
                timelineLabel,
                slug,
                role,
                contributionRate,
                repositoryUrl,
                null);
    }

    public static Project create(
            String title,
            LocalDate periodStart,
            LocalDate periodEnd,
            String summary,
            String takeaway,
            int displayOrder,
            List<ExperienceDetail.Draft> details,
            List<Skill> skills,
            boolean showOnTimeline,
            String timelineLabel,
            String slug,
            String role,
            Integer contributionRate,
            String repositoryUrl,
            Career career) {
        return new Project(
                title,
                periodStart,
                periodEnd,
                summary,
                takeaway,
                displayOrder,
                details,
                skills,
                showOnTimeline,
                timelineLabel,
                slug,
                role,
                contributionRate,
                repositoryUrl,
                career);
    }

    public static Project create(
            String title,
            LocalDate periodStart,
            LocalDate periodEnd,
            String summary,
            String takeaway,
            int displayOrder,
            List<ExperienceDetail.Draft> details,
            List<Skill> skills,
            String slug,
            String role,
            Integer contributionRate) {
        return create(
                title,
                periodStart,
                periodEnd,
                summary,
                takeaway,
                displayOrder,
                details,
                skills,
                true,
                null,
                slug,
                role,
                contributionRate);
    }

    public void update(
            String title,
            LocalDate periodStart,
            LocalDate periodEnd,
            String summary,
            String takeaway,
            int displayOrder,
            List<ExperienceDetail.Draft> details,
            List<Skill> skills,
            boolean showOnTimeline,
            String timelineLabel,
            String slug,
            String role,
            Integer contributionRate,
            String repositoryUrl) {
        update(
                title,
                periodStart,
                periodEnd,
                summary,
                takeaway,
                displayOrder,
                details,
                skills,
                showOnTimeline,
                timelineLabel,
                slug,
                role,
                contributionRate,
                repositoryUrl,
                career);
    }

    public void update(
            String title,
            LocalDate periodStart,
            LocalDate periodEnd,
            String summary,
            String takeaway,
            int displayOrder,
            List<ExperienceDetail.Draft> details,
            List<Skill> skills,
            boolean showOnTimeline,
            String timelineLabel,
            String slug,
            String role,
            Integer contributionRate,
            String repositoryUrl,
            Career career) {
        super.updateCommonFields(
                title,
                periodStart,
                periodEnd,
                summary,
                takeaway,
                displayOrder,
                details,
                skills,
                showOnTimeline,
                timelineLabel);
        this.career = career;
        this.slug = slug;
        this.role = role;
        this.contributionRate = contributionRate;
        this.repositoryUrl = repositoryUrl;
    }

    // Getters
    public String getSlug() {
        return slug;
    }

    public Career getCareer() {
        return career;
    }

    public String getRole() {
        return role;
    }

    public Integer getContributionRate() {
        return contributionRate;
    }

    public String getRepositoryUrl() {
        return repositoryUrl;
    }
}
