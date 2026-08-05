package com.selfintro.modules.study.domain.entity;

import com.selfintro.modules.taxonomy.domain.entity.TaxonomyNode;
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
@Table(name = "study_taxonomy_curation")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StudyTaxonomyCuration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "taxonomy_node_id", nullable = false)
    private TaxonomyNode taxonomyNode;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    private StudyTaxonomyCuration(TaxonomyNode taxonomyNode, int displayOrder) {
        this.taxonomyNode = taxonomyNode;
        this.displayOrder = displayOrder;
    }

    public static StudyTaxonomyCuration create(TaxonomyNode taxonomyNode, int displayOrder) {
        return new StudyTaxonomyCuration(taxonomyNode, displayOrder);
    }
}
