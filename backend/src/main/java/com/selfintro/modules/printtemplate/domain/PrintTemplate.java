package com.selfintro.modules.printtemplate.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "print_template")
public class PrintTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "excluded_ids", nullable = false, columnDefinition = "TEXT")
    private String excludedIds;

    @Column(name = "section_order", nullable = false, columnDefinition = "TEXT")
    private String sectionOrder;

    @Column(name = "section_gaps", nullable = false, columnDefinition = "TEXT")
    private String sectionGaps;

    @Column(nullable = false)
    private boolean visible;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected PrintTemplate() {
        // JPA standard constructor
    }

    private PrintTemplate(
            String name,
            String excludedIds,
            String sectionOrder,
            String sectionGaps,
            boolean visible,
            int displayOrder) {
        this.name = name;
        this.excludedIds = excludedIds;
        this.sectionOrder = sectionOrder;
        this.sectionGaps = sectionGaps;
        this.visible = visible;
        this.displayOrder = displayOrder;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public static PrintTemplate create(
            String name,
            String excludedIds,
            String sectionOrder,
            String sectionGaps,
            boolean visible,
            int displayOrder) {
        return new PrintTemplate(
                name, excludedIds, sectionOrder, sectionGaps, visible, displayOrder);
    }

    public void update(
            String name,
            String excludedIds,
            String sectionOrder,
            String sectionGaps,
            boolean visible,
            int displayOrder) {
        this.name = name;
        this.excludedIds = excludedIds;
        this.sectionOrder = sectionOrder;
        this.sectionGaps = sectionGaps;
        this.visible = visible;
        this.displayOrder = displayOrder;
        this.updatedAt = LocalDateTime.now();
    }

    // Standard Java Getters
    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getExcludedIds() {
        return excludedIds;
    }

    public String getSectionOrder() {
        return sectionOrder;
    }

    public String getSectionGaps() {
        return sectionGaps;
    }

    public boolean isVisible() {
        return visible;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
