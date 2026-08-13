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
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "study_taxonomy_curation",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uk_study_taxonomy_curation_workspace_node",
                        columnNames = {"workspace_id", "taxonomy_node_id"}))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StudyTaxonomyCuration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workspace_id", nullable = false)
    private Long workspaceId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "taxonomy_node_id", nullable = false)
    private TaxonomyNode taxonomyNode;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    private StudyTaxonomyCuration(Long workspaceId, TaxonomyNode taxonomyNode, int displayOrder) {
        this.workspaceId = workspaceId;
        this.taxonomyNode = taxonomyNode;
        this.displayOrder = displayOrder;
    }

    public static StudyTaxonomyCuration create(
            Long workspaceId, TaxonomyNode taxonomyNode, int displayOrder) {
        return new StudyTaxonomyCuration(workspaceId, taxonomyNode, displayOrder);
    }
}
