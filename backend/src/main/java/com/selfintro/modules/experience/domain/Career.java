package com.selfintro.modules.experience.domain;

import com.selfintro.modules.skill.domain.Skill;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "career")
@PrimaryKeyJoinColumn(name = "experience_id")
@DiscriminatorValue("CAREER")
public class Career extends Experience {

    @Column(name = "company_name", nullable = false, length = 80)
    private String companyName;

    @Column(name = "employment_type", nullable = false, length = 40)
    private String employmentType;

    @Column(nullable = false, length = 80)
    private String department;

    @Column(nullable = false, length = 80)
    private String role;

    protected Career() {
        // JPA standard constructor
    }

    private Career(String title, LocalDate periodStart, LocalDate periodEnd, String summary, String takeaway, String essayContent, int displayOrder, List<ExperienceDetail.Draft> details, List<Skill> skills, String companyName, String employmentType, String department, String role) {
        super(title, periodStart, periodEnd, summary, takeaway, essayContent, displayOrder, details, skills);
        this.companyName = companyName;
        this.employmentType = employmentType;
        this.department = department;
        this.role = role;
    }

    public static Career create(String title, LocalDate periodStart, LocalDate periodEnd, String summary, String takeaway, String essayContent, int displayOrder, List<ExperienceDetail.Draft> details, List<Skill> skills, String companyName, String employmentType, String department, String role) {
        return new Career(title, periodStart, periodEnd, summary, takeaway, essayContent, displayOrder, details, skills, companyName, employmentType, department, role);
    }

    public void update(String title, LocalDate periodStart, LocalDate periodEnd, String summary, String takeaway, String essayContent, int displayOrder, List<ExperienceDetail.Draft> details, List<Skill> skills, String companyName, String employmentType, String department, String role) {
        super.updateCommonFields(title, periodStart, periodEnd, summary, takeaway, essayContent, displayOrder, details, skills);
        this.companyName = companyName;
        this.employmentType = employmentType;
        this.department = department;
        this.role = role;
    }

    // Getters
    public String getCompanyName() { return companyName; }
    public String getEmploymentType() { return employmentType; }
    public String getDepartment() { return department; }
    public String getRole() { return role; }
}
