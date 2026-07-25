package com.selfintro.modules.jobapplication.domain.entity;

import com.selfintro.modules.jobapplication.domain.enums.JobApplicationStage;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "job_application")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_name", nullable = false, length = 100)
    private String companyName;

    @Column(name = "position_title", nullable = false, length = 150)
    private String positionTitle;

    @Column(name = "posting_url", length = 500)
    private String postingUrl;

    @Column(name = "source", nullable = false, length = 50)
    private String source;

    @Column(name = "applied_at", nullable = false)
    private LocalDate appliedAt;

    @Column(name = "deadline")
    private LocalDate deadline;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_stage", nullable = false, length = 30)
    private JobApplicationStage currentStage;

    @Column(name = "salary_note", length = 200)
    private String salaryNote;

    @Column(name = "memo", length = 2000)
    private String memo;

    @Column(name = "job_description", columnDefinition = "TEXT")
    private String jobDescription;

    @Column(name = "required_qualifications", columnDefinition = "TEXT")
    private String requiredQualifications;

    @Column(name = "preferred_qualifications", columnDefinition = "TEXT")
    private String preferredQualifications;

    @Column(name = "hiring_process", columnDefinition = "TEXT")
    private String hiringProcess;

    @Column(name = "application_method", columnDefinition = "TEXT")
    private String applicationMethod;

    @Column(name = "compensation_detail", columnDefinition = "TEXT")
    private String compensationDetail;

    @Column(name = "job_posting_candidate_id", updatable = false)
    private Long jobPostingCandidateId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private JobApplication(
            String companyName,
            String positionTitle,
            String postingUrl,
            String source,
            LocalDate appliedAt,
            LocalDate deadline,
            String salaryNote,
            String memo,
            String jobDescription,
            String requiredQualifications,
            String preferredQualifications,
            String hiringProcess,
            String applicationMethod,
            String compensationDetail,
            Long jobPostingCandidateId,
            LocalDateTime now) {
        this.companyName = companyName;
        this.positionTitle = positionTitle;
        this.postingUrl = postingUrl;
        this.source = source;
        this.appliedAt = appliedAt;
        this.deadline = deadline;
        this.currentStage = JobApplicationStage.APPLIED;
        this.salaryNote = salaryNote;
        this.memo = memo;
        this.jobDescription = jobDescription;
        this.requiredQualifications = requiredQualifications;
        this.preferredQualifications = preferredQualifications;
        this.hiringProcess = hiringProcess;
        this.applicationMethod = applicationMethod;
        this.compensationDetail = compensationDetail;
        this.jobPostingCandidateId = jobPostingCandidateId;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static JobApplication create(
            String companyName,
            String positionTitle,
            String postingUrl,
            String source,
            LocalDate appliedAt,
            LocalDate deadline,
            String salaryNote,
            String memo,
            String jobDescription,
            String requiredQualifications,
            String preferredQualifications,
            String hiringProcess,
            String applicationMethod,
            String compensationDetail,
            LocalDateTime now) {
        return create(
                companyName,
                positionTitle,
                postingUrl,
                source,
                appliedAt,
                deadline,
                salaryNote,
                memo,
                jobDescription,
                requiredQualifications,
                preferredQualifications,
                hiringProcess,
                applicationMethod,
                compensationDetail,
                null,
                now);
    }

    public static JobApplication create(
            String companyName,
            String positionTitle,
            String postingUrl,
            String source,
            LocalDate appliedAt,
            LocalDate deadline,
            String salaryNote,
            String memo,
            String jobDescription,
            String requiredQualifications,
            String preferredQualifications,
            String hiringProcess,
            String applicationMethod,
            String compensationDetail,
            Long jobPostingCandidateId,
            LocalDateTime now) {
        return new JobApplication(
                companyName,
                positionTitle,
                postingUrl,
                source,
                appliedAt,
                deadline,
                salaryNote,
                memo,
                jobDescription,
                requiredQualifications,
                preferredQualifications,
                hiringProcess,
                applicationMethod,
                compensationDetail,
                jobPostingCandidateId,
                now);
    }

    public void update(
            String companyName,
            String positionTitle,
            String postingUrl,
            String source,
            LocalDate appliedAt,
            LocalDate deadline,
            String salaryNote,
            String memo,
            String jobDescription,
            String requiredQualifications,
            String preferredQualifications,
            String hiringProcess,
            String applicationMethod,
            String compensationDetail,
            LocalDateTime now) {
        this.companyName = companyName;
        this.positionTitle = positionTitle;
        this.postingUrl = postingUrl;
        this.source = source;
        this.appliedAt = appliedAt;
        this.deadline = deadline;
        this.salaryNote = salaryNote;
        this.memo = memo;
        this.jobDescription = jobDescription;
        this.requiredQualifications = requiredQualifications;
        this.preferredQualifications = preferredQualifications;
        this.hiringProcess = hiringProcess;
        this.applicationMethod = applicationMethod;
        this.compensationDetail = compensationDetail;
        this.updatedAt = now;
    }

    public void changeStage(JobApplicationStage stage, LocalDateTime now) {
        this.currentStage = stage;
        this.updatedAt = now;
    }
}
