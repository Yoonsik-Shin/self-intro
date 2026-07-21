package com.selfintro.modules.architecture.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "architecture_layer")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ArchitectureLayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 16)
    private String icon;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "is_visible", nullable = false)
    private boolean visible;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "layer", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    private List<ArchitectureLayerItem> items = new ArrayList<>();

    private ArchitectureLayer(String icon, String title, int displayOrder, boolean visible) {
        this.icon = icon;
        this.title = title;
        this.displayOrder = displayOrder;
        this.visible = visible;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = createdAt;
    }

    public static ArchitectureLayer create(
            String icon, String title, int displayOrder, boolean visible) {
        return new ArchitectureLayer(icon, title, displayOrder, visible);
    }

    public void update(String icon, String title, int displayOrder, boolean visible) {
        this.icon = icon;
        this.title = title;
        this.displayOrder = displayOrder;
        this.visible = visible;
        this.updatedAt = LocalDateTime.now();
    }

    public void replaceItems(List<ItemDraft> drafts) {
        items.clear();
        for (int i = 0; i < drafts.size(); i++) {
            ItemDraft draft = drafts.get(i);
            items.add(ArchitectureLayerItem.create(this, draft.strongText(), draft.bodyText(), i));
        }
    }

    public record ItemDraft(String strongText, String bodyText) {}
}
