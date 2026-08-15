package com.selfintro.modules.printtemplate.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "print_document_artifact")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PrintDocumentArtifact {

    public static final String ORIGIN_BROWSER_UPLOAD = "BROWSER_UPLOAD";
    public static final String ORIGIN_EXTERNAL_UPLOAD = "EXTERNAL_UPLOAD";
    public static final String STATUS_READY = "READY";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workspace_id", nullable = false, updatable = false)
    private Long workspaceId;

    @Column(name = "print_template_id", nullable = false, updatable = false)
    private Long printTemplateId;

    @Column(name = "print_template_revision_id", nullable = false, updatable = false)
    private Long printTemplateRevisionId;

    @Column(name = "job_posting_id", updatable = false)
    private Long jobPostingId;

    @Column(name = "object_key", nullable = false, length = 300, updatable = false)
    private String objectKey;

    @Column(name = "sha256_checksum", nullable = false, length = 64, updatable = false)
    private String sha256Checksum;

    @Column(name = "content_length", nullable = false, updatable = false)
    private long contentLength;

    @Column(name = "content_type", nullable = false, length = 100, updatable = false)
    private String contentType;

    @Column(nullable = false, length = 30, updatable = false)
    private String origin;

    @Column(name = "renderer_version", length = 100, updatable = false)
    private String rendererVersion;

    @Column(name = "font_bundle_version", length = 100, updatable = false)
    private String fontBundleVersion;

    @Column(name = "page_count", updatable = false)
    private Integer pageCount;

    @Column(nullable = false, length = 20, updatable = false)
    private String status;

    @Column(name = "generated_at", nullable = false, updatable = false)
    private LocalDateTime generatedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private PrintDocumentArtifact(
            Long workspaceId,
            Long printTemplateId,
            Long printTemplateRevisionId,
            Long jobPostingId,
            String objectKey,
            String sha256Checksum,
            long contentLength,
            String contentType,
            String origin,
            String rendererVersion,
            String fontBundleVersion,
            Integer pageCount,
            LocalDateTime generatedAt) {
        this.workspaceId = workspaceId;
        this.printTemplateId = printTemplateId;
        this.printTemplateRevisionId = printTemplateRevisionId;
        this.jobPostingId = jobPostingId;
        this.objectKey = objectKey;
        this.sha256Checksum = sha256Checksum;
        this.contentLength = contentLength;
        this.contentType = contentType;
        this.origin = origin;
        this.rendererVersion = rendererVersion;
        this.fontBundleVersion = fontBundleVersion;
        this.pageCount = pageCount;
        this.status = STATUS_READY;
        this.generatedAt = generatedAt;
        this.createdAt = LocalDateTime.now();
    }

    public static PrintDocumentArtifact uploaded(
            Long workspaceId,
            Long printTemplateId,
            Long printTemplateRevisionId,
            Long jobPostingId,
            String objectKey,
            String sha256Checksum,
            long contentLength,
            String contentType,
            String origin,
            LocalDateTime generatedAt) {
        return new PrintDocumentArtifact(
                workspaceId,
                printTemplateId,
                printTemplateRevisionId,
                jobPostingId,
                objectKey,
                sha256Checksum,
                contentLength,
                contentType,
                origin,
                null,
                null,
                null,
                generatedAt);
    }
}
