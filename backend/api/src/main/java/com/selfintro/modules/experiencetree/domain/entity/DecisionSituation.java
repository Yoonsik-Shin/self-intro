package com.selfintro.modules.experiencetree.domain.entity;

import com.selfintro.modules.experiencetree.domain.enums.DecisionDomain;
import com.selfintro.modules.experiencetree.domain.enums.VerificationStatus;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "decision_situation")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DecisionSituation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "stable_key", nullable = false, unique = true, length = 160)
    private String stableKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private DecisionSituation parent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DecisionDomain domain;

    @Column(nullable = false, length = 80)
    private String topic;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 1000)
    private String summary;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String problem;

    @Column(name = "context_markdown", nullable = false, columnDefinition = "TEXT")
    private String contextMarkdown;

    @Column(name = "constraints_markdown", nullable = false, columnDefinition = "TEXT")
    private String constraintsMarkdown;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 20)
    private VerificationStatus verificationStatus;

    @Column(name = "content_version", nullable = false)
    private int contentVersion;

    @Column(name = "content_hash", nullable = false, length = 64)
    private String contentHash;

    @Column(name = "verified_at")
    private LocalDate verifiedAt;

    @Column(name = "next_review_at")
    private LocalDate nextReviewAt;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static DecisionSituation create(String stableKey) {
        DecisionSituation value = new DecisionSituation();
        value.stableKey = stableKey;
        value.createdAt = LocalDateTime.now();
        value.updatedAt = value.createdAt;
        return value;
    }

    public void update(
            DecisionSituation parent,
            DecisionDomain domain,
            String topic,
            String title,
            String summary,
            String problem,
            String contextMarkdown,
            String constraintsMarkdown,
            VerificationStatus verificationStatus,
            int contentVersion,
            String contentHash,
            LocalDate verifiedAt,
            LocalDate nextReviewAt,
            int displayOrder) {
        this.parent = parent;
        this.domain = domain;
        this.topic = topic;
        this.title = title;
        this.summary = summary;
        this.problem = problem;
        this.contextMarkdown = contextMarkdown;
        this.constraintsMarkdown = constraintsMarkdown;
        this.verificationStatus = verificationStatus;
        this.contentVersion = contentVersion;
        this.contentHash = contentHash;
        this.verifiedAt = verifiedAt;
        this.nextReviewAt = nextReviewAt;
        this.displayOrder = displayOrder;
        this.updatedAt = LocalDateTime.now();
    }

    public void deprecate() {
        this.parent = null;
        this.verificationStatus = VerificationStatus.DEPRECATED;
        this.updatedAt = LocalDateTime.now();
    }
}
