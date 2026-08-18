package com.selfintro.modules.taxonomy.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "taxonomy_node")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TaxonomyNode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "scheme_id", nullable = false)
    private TaxonomyScheme scheme;

    @Column(nullable = false, length = 60)
    private String name;

    @Column(nullable = false, length = 80)
    private String slug;

    @Column(name = "stable_key", nullable = false, length = 80)
    private String stableKey;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaxonomySchemeStatus status;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private TaxonomyNode parent;

    private TaxonomyNode(
            TaxonomyScheme scheme,
            String name,
            String slug,
            int displayOrder,
            TaxonomyNode parent) {
        this.scheme = scheme;
        this.name = name;
        this.slug = slug;
        this.stableKey = slug;
        this.status = TaxonomySchemeStatus.ACTIVE;
        this.displayOrder = displayOrder;
        this.parent = parent;
    }

    public static TaxonomyNode create(
            TaxonomyScheme scheme,
            String name,
            String slug,
            int displayOrder,
            TaxonomyNode parent) {
        return new TaxonomyNode(scheme, name, slug, displayOrder, parent);
    }

    public void update(String name, String slug, int displayOrder, TaxonomyNode parent) {
        this.name = name;
        this.slug = slug;
        this.displayOrder = displayOrder;
        this.parent = parent;
    }
}
