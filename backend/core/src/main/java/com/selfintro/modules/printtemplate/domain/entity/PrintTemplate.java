package com.selfintro.modules.printtemplate.domain.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "print_template")
public class PrintTemplate {

    public static final String DOCUMENT_TYPE_RESUME = "RESUME";
    public static final String DOCUMENT_TYPE_PORTFOLIO = "PORTFOLIO";
    public static final String ORIENTATION_PORTRAIT = "PORTRAIT";
    public static final String ORIENTATION_LANDSCAPE = "LANDSCAPE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "excluded_ids", nullable = false, columnDefinition = "TEXT")
    private String excludedIds;

    @Column(name = "section_order", nullable = false, columnDefinition = "TEXT")
    private String sectionOrder;

    @Column(name = "section_gaps", nullable = false, columnDefinition = "TEXT")
    private String sectionGaps;

    @Column(name = "target_role", nullable = false, length = 60)
    private String targetRole;

    @Column(name = "content_overrides", nullable = false, columnDefinition = "LONGTEXT")
    private String contentOverrides;

    @Column(name = "base_content_fingerprint", length = 64)
    private String baseContentFingerprint;

    @Column(name = "schema_version", nullable = false)
    private int schemaVersion;

    @Column(nullable = false, length = 20)
    private String source;

    @Column(name = "generation_metadata", columnDefinition = "LONGTEXT")
    private String generationMetadata;

    @Column(name = "generated_at")
    private LocalDateTime generatedAt;

    @Column(nullable = false)
    private boolean visible;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "job_posting_id")
    private Long jobPostingId;

    /** RESUME(기본, 이력서) | PORTFOLIO(포트폴리오 케이스스터디). 문서 종류별로 같은 override 구조를 공유한다. */
    @Column(name = "document_type", nullable = false, length = 20)
    private String documentType;

    /** PORTFOLIO 타입일 때만 값이 있다 — 어떤 케이스스터디의 배치인지. */
    @Column(name = "portfolio_case_study_id")
    private Long portfolioCaseStudyId;

    /** PORTRAIT(기본) | LANDSCAPE. 이력서는 항상 PORTRAIT, 포트폴리오는 둘 다 가능. */
    @Column(nullable = false, length = 10)
    private String orientation;

    @Column(name = "is_final_submission", nullable = false)
    private boolean finalSubmission;

    @Column(name = "final_pdf_object_key", length = 300)
    private String finalPdfObjectKey;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected PrintTemplate() {
        // JPA standard constructor
    }

    private PrintTemplate(
            String name,
            String excludedIds,
            String sectionOrder,
            String sectionGaps,
            String targetRole,
            String contentOverrides,
            String baseContentFingerprint,
            int schemaVersion,
            boolean visible,
            int displayOrder,
            Long jobPostingId,
            String documentType,
            Long portfolioCaseStudyId,
            String orientation,
            String source,
            String generationMetadata,
            LocalDateTime generatedAt) {
        this.name = name;
        this.excludedIds = excludedIds;
        this.sectionOrder = sectionOrder;
        this.sectionGaps = sectionGaps;
        this.targetRole = targetRole;
        this.contentOverrides = contentOverrides;
        this.baseContentFingerprint = baseContentFingerprint;
        this.schemaVersion = schemaVersion;
        this.visible = visible;
        this.displayOrder = displayOrder;
        this.jobPostingId = jobPostingId;
        this.documentType = documentType;
        this.portfolioCaseStudyId = portfolioCaseStudyId;
        this.orientation = orientation;
        this.source = source;
        this.generationMetadata = generationMetadata;
        this.generatedAt = generatedAt;
        this.finalSubmission = false;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public static PrintTemplate create(
            String name,
            String excludedIds,
            String sectionOrder,
            String sectionGaps,
            String targetRole,
            String contentOverrides,
            String baseContentFingerprint,
            int schemaVersion,
            boolean visible,
            int displayOrder,
            Long jobPostingId) {
        return new PrintTemplate(
                name,
                excludedIds,
                sectionOrder,
                sectionGaps,
                targetRole,
                contentOverrides,
                baseContentFingerprint,
                schemaVersion,
                visible,
                displayOrder,
                jobPostingId,
                DOCUMENT_TYPE_RESUME,
                null,
                ORIENTATION_PORTRAIT,
                "MANUAL",
                null,
                null);
    }

    public static PrintTemplate createAiDraft(
            String name,
            String excludedIds,
            String sectionOrder,
            String sectionGaps,
            String targetRole,
            String contentOverrides,
            String generationMetadata,
            int displayOrder,
            Long jobPostingId) {
        LocalDateTime now = LocalDateTime.now();
        return new PrintTemplate(
                name,
                excludedIds,
                sectionOrder,
                sectionGaps,
                targetRole,
                contentOverrides,
                null,
                2,
                false,
                displayOrder,
                jobPostingId,
                DOCUMENT_TYPE_RESUME,
                null,
                ORIENTATION_PORTRAIT,
                "AI",
                generationMetadata,
                now);
    }

    /** 포트폴리오 케이스스터디 배치 저장 — 방향(orientation)별로 독립된 행이다. */
    public static PrintTemplate createPortfolio(
            String name,
            Long portfolioCaseStudyId,
            String orientation,
            String excludedIds,
            String sectionOrder,
            String sectionGaps,
            String contentOverrides,
            String source,
            boolean isDefault) {
        return new PrintTemplate(
                name,
                excludedIds,
                sectionOrder,
                sectionGaps,
                "GENERAL",
                contentOverrides == null ? "{}" : contentOverrides,
                null,
                2,
                isDefault,
                0,
                null,
                DOCUMENT_TYPE_PORTFOLIO,
                portfolioCaseStudyId,
                orientation,
                source,
                null,
                null);
    }

    public static PrintTemplate create(
            String name,
            String excludedIds,
            String sectionOrder,
            String sectionGaps,
            boolean visible,
            int displayOrder) {
        return create(
                name,
                excludedIds,
                sectionOrder,
                sectionGaps,
                "GENERAL",
                "{}",
                null,
                2,
                visible,
                displayOrder,
                null);
    }

    public void update(
            String name,
            String excludedIds,
            String sectionOrder,
            String sectionGaps,
            String targetRole,
            String contentOverrides,
            String baseContentFingerprint,
            int schemaVersion,
            boolean visible,
            int displayOrder,
            Long jobPostingId) {
        this.name = name;
        this.excludedIds = excludedIds;
        this.sectionOrder = sectionOrder;
        this.sectionGaps = sectionGaps;
        this.targetRole = targetRole;
        this.contentOverrides = contentOverrides;
        this.baseContentFingerprint = baseContentFingerprint;
        this.schemaVersion = schemaVersion;
        this.visible = visible;
        this.displayOrder = displayOrder;
        if (!java.util.Objects.equals(this.jobPostingId, jobPostingId)) {
            // 연동된 공고 자체가 바뀌면 이전 공고 기준의 "최종 제출" 표시는 의미가 없다.
            this.finalSubmission = false;
        }
        this.jobPostingId = jobPostingId;
        this.updatedAt = LocalDateTime.now();
    }

    /** 포트폴리오 배치 수정 — 어떤 케이스스터디/방향인지는 식별자라 바뀌지 않는다. */
    public void updatePortfolio(
            String name,
            String excludedIds,
            String sectionOrder,
            String sectionGaps,
            String contentOverrides,
            boolean isDefault) {
        this.name = name;
        this.excludedIds = excludedIds;
        this.sectionOrder = sectionOrder;
        this.sectionGaps = sectionGaps;
        this.contentOverrides = contentOverrides == null ? "{}" : contentOverrides;
        this.visible = isDefault;
        this.updatedAt = LocalDateTime.now();
    }

    public void markFinalSubmission(boolean finalSubmission) {
        this.finalSubmission = finalSubmission;
        this.updatedAt = LocalDateTime.now();
    }

    public void attachFinalPdf(String objectKey) {
        this.finalPdfObjectKey = objectKey;
        this.updatedAt = LocalDateTime.now();
    }

    public void clearFinalPdf() {
        this.finalPdfObjectKey = null;
        this.updatedAt = LocalDateTime.now();
    }

    // Standard Java Getters
    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getExcludedIds() {
        return excludedIds;
    }

    public String getSectionOrder() {
        return sectionOrder;
    }

    public String getSectionGaps() {
        return sectionGaps;
    }

    public String getTargetRole() {
        return targetRole;
    }

    public String getContentOverrides() {
        return contentOverrides;
    }

    public String getBaseContentFingerprint() {
        return baseContentFingerprint;
    }

    public int getSchemaVersion() {
        return schemaVersion;
    }

    public String getSource() {
        return source;
    }

    public String getGenerationMetadata() {
        return generationMetadata;
    }

    public LocalDateTime getGeneratedAt() {
        return generatedAt;
    }

    public boolean isVisible() {
        return visible;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public Long getJobPostingId() {
        return jobPostingId;
    }

    public String getDocumentType() {
        return documentType;
    }

    public Long getPortfolioCaseStudyId() {
        return portfolioCaseStudyId;
    }

    public String getOrientation() {
        return orientation;
    }

    public boolean isFinalSubmission() {
        return finalSubmission;
    }

    public String getFinalPdfObjectKey() {
        return finalPdfObjectKey;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
