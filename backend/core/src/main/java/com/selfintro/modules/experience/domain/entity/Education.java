package com.selfintro.modules.experience.domain.entity;

import com.selfintro.modules.experience.domain.enums.*;
import com.selfintro.modules.skill.domain.entity.Skill;
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

    @Column(name = "education_type", nullable = false, length = 30)
    private String educationType = "ACADEMIC";

    @Column(name = "degree", length = 50)
    private String degree;

    @Column(name = "major", length = 100)
    private String major;

    @Column(name = "gpa", length = 30)
    private String gpa;

    @Column(name = "graduation_status", length = 30)
    private String graduationStatus;

    protected Education() {
        // JPA standard constructor
    }

    private Education(
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
            String institutionName,
            String educationType,
            String degree,
            String major,
            String gpa,
            String graduationStatus) {
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
        this.institutionName = institutionName;
        this.educationType =
                (educationType != null && !educationType.isBlank()) ? educationType : "ACADEMIC";
        this.degree = degree;
        this.major = major;
        this.gpa = gpa;
        this.graduationStatus = graduationStatus;
    }

    public static Education create(
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
            String institutionName,
            String educationType,
            String degree,
            String major,
            String gpa,
            String graduationStatus) {
        return new Education(
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
                institutionName,
                educationType,
                degree,
                major,
                gpa,
                graduationStatus);
    }

    public static Education create(
            String title,
            LocalDate periodStart,
            LocalDate periodEnd,
            String summary,
            String takeaway,
            int displayOrder,
            List<ExperienceDetail.Draft> details,
            List<Skill> skills,
            String institutionName) {
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
                institutionName,
                "ACADEMIC",
                null,
                null,
                null,
                null);
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
            String institutionName,
            String educationType,
            String degree,
            String major,
            String gpa,
            String graduationStatus) {
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
        this.institutionName = institutionName;
        this.educationType =
                (educationType != null && !educationType.isBlank()) ? educationType : "ACADEMIC";
        this.degree = degree;
        this.major = major;
        this.gpa = gpa;
        this.graduationStatus = graduationStatus;
    }

    // Getters
    public String getInstitutionName() {
        return institutionName;
    }

    public String getEducationType() {
        return educationType;
    }

    public String getDegree() {
        return degree;
    }

    public String getMajor() {
        return major;
    }

    public String getGpa() {
        return gpa;
    }

    public String getGraduationStatus() {
        return graduationStatus;
    }
}
