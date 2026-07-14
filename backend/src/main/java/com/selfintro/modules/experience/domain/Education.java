package com.selfintro.modules.experience.domain;

import com.selfintro.modules.skill.domain.Skill;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "education")
@PrimaryKeyJoinColumn(name = "experience_id")
@DiscriminatorValue("EDUCATION")
public class Education extends Experience {

    @Column(name = "institution_name", nullable = false, length = 100)
    private String institutionName;

    protected Education() {
        // JPA standard constructor
    }

    private Education(String title, LocalDate periodStart, LocalDate periodEnd, String summary, String takeaway, String essayContent, int displayOrder, List<ExperienceDetail.Draft> details, List<Skill> skills, String institutionName) {
        super(title, periodStart, periodEnd, summary, takeaway, essayContent, displayOrder, details, skills);
        this.institutionName = institutionName;
    }

    public static Education create(String title, LocalDate periodStart, LocalDate periodEnd, String summary, String takeaway, String essayContent, int displayOrder, List<ExperienceDetail.Draft> details, List<Skill> skills, String institutionName) {
        return new Education(title, periodStart, periodEnd, summary, takeaway, essayContent, displayOrder, details, skills, institutionName);
    }

    public void update(String title, LocalDate periodStart, LocalDate periodEnd, String summary, String takeaway, String essayContent, int displayOrder, List<ExperienceDetail.Draft> details, List<Skill> skills, String institutionName) {
        super.updateCommonFields(title, periodStart, periodEnd, summary, takeaway, essayContent, displayOrder, details, skills);
        this.institutionName = institutionName;
    }

    // Getters
    public String getInstitutionName() { return institutionName; }
}
