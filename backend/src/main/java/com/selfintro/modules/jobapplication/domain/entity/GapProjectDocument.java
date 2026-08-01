package com.selfintro.modules.jobapplication.domain.entity;

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
@Table(name = "gap_project_document")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GapProjectDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_posting_id", nullable = false)
    private Long jobPostingId;

    @Column(nullable = false)
    private int version;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "source_appeal_analyzed_at")
    private LocalDateTime sourceAppealAnalyzedAt;

    @Column(name = "gap_snapshot", nullable = false, columnDefinition = "LONGTEXT")
    private String gapSnapshot;

    @Column(name = "content_json", nullable = false, columnDefinition = "LONGTEXT")
    private String contentJson;

    @Column(name = "rendered_markdown", nullable = false, columnDefinition = "LONGTEXT")
    private String renderedMarkdown;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static GapProjectDocument create(
            Long jobPostingId,
            int version,
            String title,
            LocalDateTime sourceAppealAnalyzedAt,
            String gapSnapshot,
            String contentJson,
            String renderedMarkdown) {
        GapProjectDocument document = new GapProjectDocument();
        document.jobPostingId = jobPostingId;
        document.version = version;
        document.title = title;
        document.sourceAppealAnalyzedAt = sourceAppealAnalyzedAt;
        document.gapSnapshot = gapSnapshot;
        document.contentJson = contentJson;
        document.renderedMarkdown = renderedMarkdown;
        document.status = "DRAFT";
        document.createdAt = LocalDateTime.now();
        document.updatedAt = document.createdAt;
        return document;
    }
}
