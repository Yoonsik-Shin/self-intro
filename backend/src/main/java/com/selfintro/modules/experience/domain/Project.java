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

    @Column(nullable = false, length = 40)
    private String slug;

    @Column(nullable = false, length = 80)
    private String role;

    @Column(name = "contribution_rate", nullable = false)
    private int contributionRate;

    protected Project() {
        // JPA standard constructor
    }

    private Project(String title, LocalDate periodStart, LocalDate periodEnd, String summary, String takeaway, String essayContent, int displayOrder, List<ExperienceDetail.Draft> details, List<Skill> skills, String slug, String role, int contributionRate) {
        super(title, periodStart, periodEnd, summary, takeaway, essayContent, displayOrder, details, skills);
        this.slug = slug;
        this.role = role;
        this.contributionRate = contributionRate;
    }

    public static Project create(String title, LocalDate periodStart, LocalDate periodEnd, String summary, String takeaway, String essayContent, int displayOrder, List<ExperienceDetail.Draft> details, List<Skill> skills, String slug, String role, int contributionRate) {
        return new Project(title, periodStart, periodEnd, summary, takeaway, essayContent, displayOrder, details, skills, slug, role, contributionRate);
    }

    public void update(String title, LocalDate periodStart, LocalDate periodEnd, String summary, String takeaway, String essayContent, int displayOrder, List<ExperienceDetail.Draft> details, List<Skill> skills, String slug, String role, int contributionRate) {
        super.updateCommonFields(title, periodStart, periodEnd, summary, takeaway, essayContent, displayOrder, details, skills);
        this.slug = slug;
        this.role = role;
        this.contributionRate = contributionRate;
    }

    // Getters
    public String getSlug() { return slug; }
    public String getRole() { return role; }
    public int getContributionRate() { return contributionRate; }
}
