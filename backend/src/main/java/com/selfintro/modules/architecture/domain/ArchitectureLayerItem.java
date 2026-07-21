package com.selfintro.modules.architecture.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "architecture_layer_item")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ArchitectureLayerItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "layer_id", nullable = false)
    private ArchitectureLayer layer;

    @Column(name = "strong_text", length = 200)
    private String strongText;

    @Column(name = "body_text", nullable = false, length = 500)
    private String bodyText;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    private ArchitectureLayerItem(
            ArchitectureLayer layer, String strongText, String bodyText, int displayOrder) {
        this.layer = layer;
        this.strongText = strongText == null || strongText.isBlank() ? null : strongText.trim();
        this.bodyText = bodyText;
        this.displayOrder = displayOrder;
    }

    static ArchitectureLayerItem create(
            ArchitectureLayer layer, String strongText, String bodyText, int displayOrder) {
        return new ArchitectureLayerItem(layer, strongText, bodyText, displayOrder);
    }
}
