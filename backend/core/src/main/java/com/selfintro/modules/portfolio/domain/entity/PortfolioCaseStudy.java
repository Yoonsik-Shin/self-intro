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
@Table(name = "portfolio_case_study")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PortfolioCaseStudy {

    public static final String STATUS_DRAFT = "DRAFT";
    public static final String STATUS_PUBLISHED = "PUBLISHED";
    public static final String STATUS_ARCHIVED = "ARCHIVED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workspace_id", nullable = false)
    private Long workspaceId;

    @Column(name = "experience_id", nullable = false)
    private Long experienceId;

    @Column(nullable = false, length = 160)
    private String slug;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "published_revision_id")
    private Long publishedRevisionId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static PortfolioCaseStudy create(
            Long workspaceId, Long experienceId, String slug, String title) {
        PortfolioCaseStudy caseStudy = new PortfolioCaseStudy();
        caseStudy.workspaceId = workspaceId;
        caseStudy.experienceId = experienceId;
        caseStudy.slug = slug;
        caseStudy.title = title;
        caseStudy.status = STATUS_DRAFT;
        caseStudy.createdAt = LocalDateTime.now();
        caseStudy.updatedAt = caseStudy.createdAt;
        return caseStudy;
    }

    public void rename(String slug, String title) {
        this.slug = slug;
        this.title = title;
        this.updatedAt = LocalDateTime.now();
    }

    public void publish(Long revisionId) {
        this.publishedRevisionId = revisionId;
        this.status = STATUS_PUBLISHED;
        this.updatedAt = LocalDateTime.now();
    }

    public void archive() {
        this.status = STATUS_ARCHIVED;
        this.updatedAt = LocalDateTime.now();
    }

    public void backToDraft() {
        this.status = STATUS_DRAFT;
        this.publishedRevisionId = null;
        this.updatedAt = LocalDateTime.now();
    }
}
