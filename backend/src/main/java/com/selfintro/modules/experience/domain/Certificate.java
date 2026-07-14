package com.selfintro.modules.experience.domain;

import com.selfintro.modules.skill.domain.Skill;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "certificate")
@PrimaryKeyJoinColumn(name = "experience_id")
@DiscriminatorValue("CERTIFICATE")
public class Certificate extends Experience {

    @Column(nullable = false, length = 100)
    private String issuer;

    protected Certificate() {
        // JPA standard constructor
    }

    private Certificate(String title, LocalDate periodStart, LocalDate periodEnd, String summary, String takeaway, String essayContent, int displayOrder, List<ExperienceDetail.Draft> details, List<Skill> skills, String issuer) {
        super(title, periodStart, periodEnd, summary, takeaway, essayContent, displayOrder, details, skills);
        this.issuer = issuer;
    }

    public static Certificate create(String title, LocalDate periodStart, LocalDate periodEnd, String summary, String takeaway, String essayContent, int displayOrder, List<ExperienceDetail.Draft> details, List<Skill> skills, String issuer) {
        return new Certificate(title, periodStart, periodEnd, summary, takeaway, essayContent, displayOrder, details, skills, issuer);
    }

    public void update(String title, LocalDate periodStart, LocalDate periodEnd, String summary, String takeaway, String essayContent, int displayOrder, List<ExperienceDetail.Draft> details, List<Skill> skills, String issuer) {
        super.updateCommonFields(title, periodStart, periodEnd, summary, takeaway, essayContent, displayOrder, details, skills);
        this.issuer = issuer;
    }

    // Getters
    public String getIssuer() { return issuer; }
}
