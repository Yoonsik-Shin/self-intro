package com.selfintro.modules.printtemplate.domain.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "print_template")
public class PrintTemplate {

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
                "AI",
                generationMetadata,
                now);
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
