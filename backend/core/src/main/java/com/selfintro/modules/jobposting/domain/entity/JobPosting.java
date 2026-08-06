package com.selfintro.modules.jobposting.domain.entity;

import com.selfintro.modules.jobposting.domain.enums.JobPostingSource;
import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import com.selfintro.modules.jobposting.domain.util.JobPostingNormalizer;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 채용 공고 하나를 발견(수집)부터 지원 결과까지 하나의 행으로 추적한다. 예전에는 "아직 지원 안 한 후보"(JobPostingCandidate)와 "이미 지원한
 * 공고"(JobApplication)를 별개 테이블로 나누고 전환 시점에 필드를 복사했지만, 실제로는 같은 공고의 생애주기일 뿐이라 {@link
 * JobPostingStatus}가 그 흐름을 그대로 표현하도록 통합했다.
 */
@Getter
@Entity
@Table(name = "job_posting")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobPosting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_name", nullable = false, length = 100)
    private String companyName;

    /** {@link #companyName}을 정규화한 매칭 키. 플랫폼 간 같은 공고 판별(회사+직무 완전일치)에 쓰인다. */
    @Column(name = "company_name_normalized", length = 100)
    private String companyNameNormalized;

    @Column(name = "position_title", nullable = false, length = 150)
    private String positionTitle;

    @Column(name = "position_title_normalized", length = 150)
    private String positionTitleNormalized;

    @Column(name = "posting_url", length = 500)
    private String postingUrl;

    /** 사람인 등에서 매긴 원본 ID. 재수집 시 중복 방지에 쓰인다(URL이 없거나 바뀌는 경우 대비). */
    @Column(name = "external_id", length = 100)
    private String externalId;

    /** 내부 로직(중복 수집 방지·만료 처리)이 기준으로 삼는 값. 사용자에게 보여주는 {@link #source}와는 별개다. */
    @Enumerated(EnumType.STRING)
    @Column(name = "collection_method", nullable = false, length = 30)
    private JobPostingSource collectionMethod;

    /** 사용자에게 보여주고 직접 고칠 수도 있는 자유 텍스트 출처(예: "사람인", "URL 수집", "직접입력"). */
    @Column(name = "source", nullable = false, length = 50)
    private String source;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private JobPostingStatus status;

    /** 지원 전(NEW/SAVED/DISMISSED/EXPIRED)에는 null이고, {@link #apply}가 호출되는 순간 채워진다. */
    @Column(name = "applied_at")
    private LocalDate appliedAt;

    @Column(name = "deadline")
    private LocalDate deadline;

    @Column(name = "deadline_time")
    private java.time.LocalTime deadlineTime;

    /** 마감일이 없으면서 공고 원문에 상시채용이라고 명시된 경우 true. 단순히 마감일을 못 읽은 경우와 구분하는 용도다. */
    @Column(name = "is_always_open", nullable = false)
    private boolean alwaysOpen;

    @Column(name = "salary_note", length = 200)
    private String salaryNote;

    @Column(name = "location", length = 100)
    private String location;

    @Column(name = "latitude", precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "employment_type", length = 50)
    private String employmentType;

    @Column(name = "memo", columnDefinition = "TEXT")
    private String memo;

    /** 매칭 평가용 원문(사람인 요구기술/URL 수집 시 합친 요건 텍스트). 지원 이후에는 더 갱신되지 않지만 이력상 남겨둔다. */
    @Column(name = "required_skills_raw", columnDefinition = "TEXT")
    private String requiredSkillsRaw;

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

    /** 수집 시 키워드+AI로 자동 계산되는 예비 점수. 지원 후에도 그대로 남아 과거 판단 근거로 쓰인다. */
    @Column(name = "match_score")
    private Integer matchScore;

    @Column(name = "match_reason", length = 500)
    private String matchReason;

    @Column(name = "appeal_analysis", columnDefinition = "TEXT")
    private String appealAnalysis;

    @Column(name = "appeal_analyzed_at")
    private LocalDateTime appealAnalyzedAt;

    @Column(name = "jobplanet_rating", precision = 2, scale = 1)
    private BigDecimal jobplanetRating;

    @Column(name = "jobplanet_review_count")
    private Integer jobplanetReviewCount;

    @Column(name = "jobplanet_company_name", length = 120)
    private String jobplanetCompanyName;

    @Column(name = "jobplanet_company_url", length = 500)
    private String jobplanetCompanyUrl;

    @Column(name = "jobplanet_checked_at")
    private LocalDateTime jobplanetCheckedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /** 현재 상태로 마지막 변경된 시각. 공고 내용 편집이나 AI 분석 시각과 분리해 보드의 단계 체류 기준일로 쓴다. */
    @Column(name = "status_changed_at", nullable = false)
    private LocalDateTime statusChangedAt;

    private JobPosting(
            String companyName,
            String positionTitle,
            String postingUrl,
            String externalId,
            JobPostingSource collectionMethod,
            String source,
            JobPostingStatus status,
            LocalDate appliedAt,
            LocalDate deadline,
            boolean alwaysOpen,
            String salaryNote,
            String location,
            String employmentType,
            String memo,
            String requiredSkillsRaw,
            String jobDescription,
            String requiredQualifications,
            String preferredQualifications,
            String hiringProcess,
            String applicationMethod,
            String compensationDetail,
            LocalDateTime now) {
        this.companyName = companyName;
        this.companyNameNormalized = JobPostingNormalizer.normalizeCompanyName(companyName);
        this.positionTitle = positionTitle;
        this.positionTitleNormalized = JobPostingNormalizer.normalizePositionTitle(positionTitle);
        this.postingUrl = postingUrl;
        this.externalId = externalId;
        this.collectionMethod = collectionMethod;
        this.source = source;
        this.status = status;
        this.appliedAt = appliedAt;
        this.deadline = deadline;
        this.alwaysOpen = alwaysOpen;
        this.salaryNote = salaryNote;
        this.location = location;
        this.employmentType = employmentType;
        this.memo = memo;
        this.requiredSkillsRaw = requiredSkillsRaw;
        this.jobDescription = jobDescription;
        this.requiredQualifications = requiredQualifications;
        this.preferredQualifications = preferredQualifications;
        this.hiringProcess = hiringProcess;
        this.applicationMethod = applicationMethod;
        this.compensationDetail = compensationDetail;
        this.createdAt = now;
        this.updatedAt = now;
        this.statusChangedAt = now;
    }

    /** URL 수집/사람인 자동수집으로 "아직 지원 안 한 후보"를 만든다. */
    public static JobPosting collect(Draft draft, LocalDateTime now) {
        JobPosting posting =
                new JobPosting(
                        draft.companyName(),
                        draft.positionTitle(),
                        draft.postingUrl(),
                        draft.externalId(),
                        draft.collectionMethod(),
                        draft.sourceLabel(),
                        JobPostingStatus.NEW,
                        null,
                        draft.deadline(),
                        draft.alwaysOpen(),
                        draft.salaryNote(),
                        draft.location(),
                        draft.employmentType(),
                        null,
                        draft.requiredSkillsRaw(),
                        draft.jobDescription(),
                        draft.requiredQualifications(),
                        draft.preferredQualifications(),
                        draft.hiringProcess(),
                        draft.applicationMethod(),
                        draft.compensationDetail(),
                        now);
        posting.deadlineTime = draft.deadlineTime();
        return posting;
    }

    public java.time.LocalTime getDeadlineTime() {
        if (alwaysOpen || deadline == null) {
            return null;
        }
        return deadlineTime != null ? deadlineTime : java.time.LocalTime.of(23, 59, 59);
    }

    public void setDeadlineTime(java.time.LocalTime deadlineTime) {
        this.deadlineTime = deadlineTime;
    }

    /** "새 지원 공고 등록" — 수집 단계 없이 이미 지원 완료한 공고를 바로 기록한다. */
    public static JobPosting registerApplied(
            String companyName,
            String positionTitle,
            String postingUrl,
            String source,
            LocalDate appliedAt,
            LocalDate deadline,
            java.time.LocalTime deadlineTime,
            boolean alwaysOpen,
            String salaryNote,
            String location,
            String employmentType,
            String memo,
            String jobDescription,
            String requiredQualifications,
            String preferredQualifications,
            String hiringProcess,
            String applicationMethod,
            String compensationDetail,
            LocalDateTime now) {
        JobPosting posting = new JobPosting(
                companyName,
                positionTitle,
                postingUrl,
                null,
                JobPostingSource.MANUAL,
                source,
                JobPostingStatus.APPLIED,
                appliedAt,
                deadline,
                alwaysOpen,
                salaryNote,
                location,
                employmentType,
                memo,
                null,
                jobDescription,
                requiredQualifications,
                preferredQualifications,
                hiringProcess,
                applicationMethod,
                compensationDetail,
                now);
        posting.deadlineTime = deadlineTime;
        return posting;
    }

    public static JobPosting registerApplied(
            String companyName,
            String positionTitle,
            String postingUrl,
            String source,
            LocalDate appliedAt,
            LocalDate deadline,
            boolean alwaysOpen,
            String salaryNote,
            String location,
            String employmentType,
            String memo,
            String jobDescription,
            String requiredQualifications,
            String preferredQualifications,
            String hiringProcess,
            String applicationMethod,
            String compensationDetail,
            LocalDateTime now) {
        return registerApplied(
                companyName,
                positionTitle,
                postingUrl,
                source,
                appliedAt,
                deadline,
                null,
                alwaysOpen,
                salaryNote,
                location,
                employmentType,
                memo,
                jobDescription,
                requiredQualifications,
                preferredQualifications,
                hiringProcess,
                applicationMethod,
                compensationDetail,
                now);
    }

    /**
     * 지원 전/후 공통으로 편집 가능한 필드를 한 번에 갱신한다. status/appliedAt은 여기서 바꾸지 않는다 — 그건 {@link #apply}와 {@link
     * #changeStatus}의 몫이다.
     */
    public void update(
            String companyName,
            String positionTitle,
            String postingUrl,
            String source,
            LocalDate deadline,
            java.time.LocalTime deadlineTime,
            boolean alwaysOpen,
            String salaryNote,
            String location,
            String employmentType,
            String memo,
            String jobDescription,
            String requiredQualifications,
            String preferredQualifications,
            String hiringProcess,
            String applicationMethod,
            String compensationDetail,
            LocalDateTime now) {
        this.companyName = companyName;
        this.companyNameNormalized = JobPostingNormalizer.normalizeCompanyName(companyName);
        this.positionTitle = positionTitle;
        this.positionTitleNormalized = JobPostingNormalizer.normalizePositionTitle(positionTitle);
        this.postingUrl = postingUrl;
        this.source = source;
        this.deadline = deadline;
        this.deadlineTime = deadlineTime;
        this.alwaysOpen = alwaysOpen;
        this.salaryNote = salaryNote;
        this.location = location;
        this.employmentType = employmentType;
        this.memo = memo;
        this.jobDescription = jobDescription;
        this.requiredQualifications = requiredQualifications;
        this.preferredQualifications = preferredQualifications;
        this.hiringProcess = hiringProcess;
        this.applicationMethod = applicationMethod;
        this.compensationDetail = compensationDetail;
        this.updatedAt = now;
    }

    public void update(
            String companyName,
            String positionTitle,
            String postingUrl,
            String source,
            LocalDate deadline,
            boolean alwaysOpen,
            String salaryNote,
            String location,
            String employmentType,
            String memo,
            String jobDescription,
            String requiredQualifications,
            String preferredQualifications,
            String hiringProcess,
            String applicationMethod,
            String compensationDetail,
            LocalDateTime now) {
        update(
                companyName,
                positionTitle,
                postingUrl,
                source,
                deadline,
                this.deadlineTime,
                alwaysOpen,
                salaryNote,
                location,
                employmentType,
                memo,
                jobDescription,
                requiredQualifications,
                preferredQualifications,
                hiringProcess,
                applicationMethod,
                compensationDetail,
                now);
    }

    public void updateMemo(String memo, LocalDateTime now) {
        this.memo = memo;
        this.updatedAt = now;
    }

    /** 다른 플랫폼에서 같은 공고로 매칭된 URL을 추가로 등록할 때, 본문 필드는 건드리지 않고 갱신 시각만 남긴다. */
    public void touch(LocalDateTime now) {
        this.updatedAt = now;
    }

    /** 정규화 매칭 키가 생기기 전에 만들어진 행을 위한 백필 전용 메서드. 갱신 시각은 건드리지 않는다. */
    public void backfillNormalizedKeys() {
        if (this.companyNameNormalized == null) {
            this.companyNameNormalized = JobPostingNormalizer.normalizeCompanyName(this.companyName);
        }
        if (this.positionTitleNormalized == null) {
            this.positionTitleNormalized =
                    JobPostingNormalizer.normalizePositionTitle(this.positionTitle);
        }
    }

    public void applyMatch(Integer score, String reason, LocalDateTime now) {
        this.matchScore = score;
        this.matchReason = reason;
        this.updatedAt = now;
    }

    /**
     * 지원 전까지는 정보 새로고침·재매칭 때마다 최신 직무상세/자격요건 텍스트로 매칭 원문을
     * 다시 합쳐도 되지만, {@link #requiredSkillsRaw} 필드 설명대로 지원 이후엔 그 시점 요건을
     * 이력으로 고정해야 하므로 갱신하지 않는다.
     */
    public void refreshRequiredSkillsRaw(String requiredSkillsRaw) {
        if (this.status == JobPostingStatus.APPLIED) {
            return;
        }
        this.requiredSkillsRaw = requiredSkillsRaw;
    }

    public void applyAppealAnalysis(String analysis, LocalDateTime now) {
        this.appealAnalysis = analysis;
        this.appealAnalyzedAt = now;
        this.updatedAt = now;
    }

    public void updateJobplanet(
            BigDecimal rating,
            Integer reviewCount,
            String companyName,
            String companyUrl,
            LocalDateTime now) {
        this.jobplanetRating = rating;
        this.jobplanetReviewCount = reviewCount;
        this.jobplanetCompanyName = companyName;
        this.jobplanetCompanyUrl = companyUrl;
        this.jobplanetCheckedAt = now;
        this.updatedAt = now;
    }

    public void clearJobplanet(LocalDateTime now) {
        this.jobplanetRating = null;
        this.jobplanetReviewCount = null;
        this.jobplanetCompanyName = null;
        this.jobplanetCompanyUrl = null;
        this.jobplanetCheckedAt = null;
        this.updatedAt = now;
    }

    public void save(LocalDateTime now) {
        if (status == JobPostingStatus.NEW) {
            this.status = JobPostingStatus.SAVED;
            this.updatedAt = now;
            this.statusChangedAt = now;
        }
    }

    public void unsave(LocalDateTime now) {
        if (status == JobPostingStatus.SAVED) {
            this.status = JobPostingStatus.NEW;
            this.updatedAt = now;
            this.statusChangedAt = now;
        }
    }

    public void dismiss(LocalDateTime now) {
        this.status = JobPostingStatus.DISMISSED;
        this.updatedAt = now;
        this.statusChangedAt = now;
    }

    public void undismiss(LocalDateTime now) {
        if (status == JobPostingStatus.DISMISSED) {
            this.status = JobPostingStatus.NEW;
            this.updatedAt = now;
            this.statusChangedAt = now;
        }
    }

    public void markExpired(LocalDateTime now) {
        this.status = JobPostingStatus.EXPIRED;
        this.updatedAt = now;
        this.statusChangedAt = now;
    }

    /** 지원 전 후보를 실제 지원 상태로 전환한다("전환" 버튼) — 새 행을 만들지 않고 이 행 자체가 지원 공고가 된다. */
    public void apply(LocalDate appliedAt, LocalDateTime now) {
        this.status = JobPostingStatus.APPLIED;
        this.appliedAt = appliedAt;
        this.updatedAt = now;
        this.statusChangedAt = now;
    }

    /** 지원 이후 전형 단계를 바꾼다. */
    public void changeStatus(JobPostingStatus status, LocalDateTime now) {
        this.status = status;
        this.updatedAt = now;
        this.statusChangedAt = now;
    }

    /** 실수로 지원 전환했거나 보드에서 잘못 옮긴 경우 되돌린다 — 지원 전 상태로 돌아가므로 {@link #apply}가 채웠던 지원일도 함께 지운다. */
    public void updateCoordinates(BigDecimal latitude, BigDecimal longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public void unapply(LocalDateTime now) {
        this.status = JobPostingStatus.NEW;
        this.appliedAt = null;
        this.updatedAt = now;
        this.statusChangedAt = now;
    }

    public record Draft(
            String positionTitle,
            String companyName,
            String postingUrl,
            String externalId,
            JobPostingSource collectionMethod,
            String requiredSkillsRaw,
            String location,
            String employmentType,
            LocalDate deadline,
            java.time.LocalTime deadlineTime,
            boolean alwaysOpen,
            String salaryNote,
            String jobDescription,
            String requiredQualifications,
            String preferredQualifications,
            String hiringProcess,
            String applicationMethod,
            String compensationDetail) {

        public Draft(
                String positionTitle,
                String companyName,
                String postingUrl,
                String externalId,
                JobPostingSource collectionMethod,
                String requiredSkillsRaw,
                String location,
                String employmentType,
                LocalDate deadline,
                boolean alwaysOpen,
                String salaryNote,
                String jobDescription,
                String requiredQualifications,
                String preferredQualifications,
                String hiringProcess,
                String applicationMethod,
                String compensationDetail) {
            this(
                    positionTitle,
                    companyName,
                    postingUrl,
                    externalId,
                    collectionMethod,
                    requiredSkillsRaw,
                    location,
                    employmentType,
                    deadline,
                    null,
                    alwaysOpen,
                    salaryNote,
                    jobDescription,
                    requiredQualifications,
                    preferredQualifications,
                    hiringProcess,
                    applicationMethod,
                    compensationDetail);
        }

        public String sourceLabel() {
            return switch (collectionMethod) {
                case URL_INGEST -> "URL 수집";
                case SARAMIN -> "사람인";
                case MANUAL -> "직접입력";
                case IMAGE_INGEST -> "스크린샷 등록";
            };
        }
    }
}
