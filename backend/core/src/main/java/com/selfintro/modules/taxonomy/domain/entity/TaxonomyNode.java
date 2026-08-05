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

    @Column(nullable = false, unique = true, length = 60)
    private String name;

    @Column(nullable = false, unique = true, length = 80)
    private String slug;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private TaxonomyNode parent;

    private TaxonomyNode(String name, String slug, int displayOrder, TaxonomyNode parent) {
        this.name = name;
        this.slug = slug;
        this.displayOrder = displayOrder;
        this.parent = parent;
    }

    public static TaxonomyNode create(String name, String slug, int displayOrder, TaxonomyNode parent) {
        return new TaxonomyNode(name, slug, displayOrder, parent);
    }

    public void update(String name, String slug, int displayOrder, TaxonomyNode parent) {
        this.name = name;
        this.slug = slug;
        this.displayOrder = displayOrder;
        this.parent = parent;
    }
}
