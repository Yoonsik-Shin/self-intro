package com.selfintro.modules.portfolio.domain.entity;

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
@Table(name = "portfolio_case_study_revision")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PortfolioCaseStudyRevision {

    public static final String SOURCE_AI = "AI";
    public static final String SOURCE_MANUAL = "MANUAL";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_study_id", nullable = false)
    private Long caseStudyId;

    @Column(nullable = false)
    private int version;

    @Column(nullable = false, length = 10)
    private String source;

    @Column(name = "content_json", nullable = false, columnDefinition = "LONGTEXT")
    private String contentJson;

    @Column(name = "rendered_markdown", nullable = false, columnDefinition = "LONGTEXT")
    private String renderedMarkdown;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static PortfolioCaseStudyRevision create(
            Long caseStudyId,
            int version,
            String source,
            String contentJson,
            String renderedMarkdown) {
        PortfolioCaseStudyRevision revision = new PortfolioCaseStudyRevision();
        revision.caseStudyId = caseStudyId;
        revision.version = version;
        revision.source = source;
        revision.contentJson = contentJson;
        revision.renderedMarkdown = renderedMarkdown;
        revision.createdAt = LocalDateTime.now();
        return revision;
    }
}
