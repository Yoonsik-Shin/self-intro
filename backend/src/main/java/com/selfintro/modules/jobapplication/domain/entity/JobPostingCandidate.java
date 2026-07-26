package com.selfintro.modules.jobapplication.domain.entity;

import com.selfintro.modules.jobapplication.domain.enums.JobPostingCandidateStatus;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingSource;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "job_posting_candidate")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobPostingCandidate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "external_id", length = 100)
    private String externalId;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "company_name", nullable = false, length = 100)
    private String companyName;

    @Column(name = "url", nullable = false, length = 500)
    private String url;

    @Lob
    @Column(name = "required_skills_raw", length = 65_535)
    private String requiredSkillsRaw;

    @Column(name = "location", length = 100)
    private String location;

    @Column(name = "employment_type", length = 50)
    private String employmentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 30)
    private JobPostingSource source;

    @Column(name = "deadline")
    private LocalDate deadline;

    @Column(name = "salary_note", length = 200)
    private String salaryNote;

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

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private JobPostingCandidateStatus status;

    @Column(name = "match_score")
    private Integer matchScore;

    @Column(name = "match_reason", length = 500)
    private String matchReason;

    @Column(name = "appeal_analysis", columnDefinition = "TEXT")
    private String appealAnalysis;

    @Column(name = "appeal_analyzed_at")
    private LocalDateTime appealAnalyzedAt;

    @Column(name = "fetched_at", nullable = false, updatable = false)
    private LocalDateTime fetchedAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private JobPostingCandidate(Draft draft, LocalDateTime now) {
        this.externalId = draft.externalId();
        this.title = draft.title();
        this.companyName = draft.companyName();
        this.url = draft.url();
        this.requiredSkillsRaw = draft.requiredSkillsRaw();
        this.location = draft.location();
        this.employmentType = draft.employmentType();
        this.source = draft.source();
        this.deadline = draft.deadline();
        this.salaryNote = draft.salaryNote();
        this.jobDescription = draft.jobDescription();
        this.requiredQualifications = draft.requiredQualifications();
        this.preferredQualifications = draft.preferredQualifications();
        this.hiringProcess = draft.hiringProcess();
        this.applicationMethod = draft.applicationMethod();
        this.compensationDetail = draft.compensationDetail();
        this.status = JobPostingCandidateStatus.NEW;
        this.fetchedAt = now;
        this.updatedAt = now;
    }

    public static JobPostingCandidate create(Draft draft, LocalDateTime now) {
        return new JobPostingCandidate(draft, now);
    }

    public void applyMatch(Integer score, String reason, LocalDateTime now) {
        this.matchScore = score;
        this.matchReason = reason;
        this.updatedAt = now;
    }

    public void applyAppealAnalysis(String analysis, LocalDateTime now) {
        this.appealAnalysis = analysis;
        this.appealAnalyzedAt = now;
        this.updatedAt = now;
    }

    public void save(LocalDateTime now) {
        if (status == JobPostingCandidateStatus.NEW) {
            this.status = JobPostingCandidateStatus.SAVED;
            this.updatedAt = now;
        }
    }

    public void unsave(LocalDateTime now) {
        if (status == JobPostingCandidateStatus.SAVED) {
            this.status = JobPostingCandidateStatus.NEW;
            this.updatedAt = now;
        }
    }

    public void dismiss(LocalDateTime now) {
        this.status = JobPostingCandidateStatus.DISMISSED;
        this.updatedAt = now;
    }

    public void markConverted(LocalDateTime now) {
        this.status = JobPostingCandidateStatus.CONVERTED;
        this.updatedAt = now;
    }

    /** 전환됐던 지원 공고가 삭제됐을 때, 후보를 다시 목록에 보이고 재수집 가능한 상태로 되돌린다. */
    public void revertToNew(LocalDateTime now) {
        this.status = JobPostingCandidateStatus.NEW;
        this.updatedAt = now;
    }

    public void markExpired(LocalDateTime now) {
        this.status = JobPostingCandidateStatus.EXPIRED;
        this.updatedAt = now;
    }

    public record Draft(
            String externalId,
            String title,
            String companyName,
            String url,
            JobPostingSource source,
            String requiredSkillsRaw,
            String location,
            String employmentType,
            LocalDate deadline,
            String salaryNote,
            String jobDescription,
            String requiredQualifications,
            String preferredQualifications,
            String hiringProcess,
            String applicationMethod,
            String compensationDetail) {}
}
