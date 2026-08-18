package com.selfintro.modules.taxonomy.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "workspace_taxonomy_scheme_subscription")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspaceTaxonomySchemeSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workspace_id", nullable = false)
    private Long workspaceId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "scheme_id", nullable = false)
    private TaxonomyScheme scheme;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "primary_scheme", nullable = false)
    private boolean primaryScheme;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static WorkspaceTaxonomySchemeSubscription primary(
            Long workspaceId, TaxonomyScheme scheme) {
        return create(workspaceId, scheme, true, 0);
    }

    public static WorkspaceTaxonomySchemeSubscription create(
            Long workspaceId, TaxonomyScheme scheme, boolean primaryScheme, int displayOrder) {
        WorkspaceTaxonomySchemeSubscription subscription =
                new WorkspaceTaxonomySchemeSubscription();
        subscription.workspaceId = workspaceId;
        subscription.scheme = scheme;
        subscription.enabled = true;
        subscription.primaryScheme = primaryScheme;
        subscription.displayOrder = displayOrder;
        subscription.createdAt = LocalDateTime.now();
        subscription.updatedAt = subscription.createdAt;
        return subscription;
    }
}
