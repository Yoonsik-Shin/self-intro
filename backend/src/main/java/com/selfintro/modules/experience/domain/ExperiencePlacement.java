package com.selfintro.modules.experience.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "experience_placement",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uk_experience_placement",
                        columnNames = {"experience_id", "placement_type"}))
public class ExperiencePlacement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "experience_id", nullable = false)
    private Experience experience;

    @Enumerated(EnumType.STRING)
    @Column(name = "placement_type", nullable = false, length = 40)
    private ExperiencePlacementType placementType;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected ExperiencePlacement() {}

    private ExperiencePlacement(
            Experience experience,
            ExperiencePlacementType placementType,
            int displayOrder,
            boolean enabled) {
        this.experience = experience;
        this.placementType = placementType;
        this.displayOrder = displayOrder;
        this.enabled = enabled;
    }

    public static ExperiencePlacement create(
            Experience experience,
            ExperiencePlacementType placementType,
            int displayOrder,
            boolean enabled) {
        return new ExperiencePlacement(experience, placementType, displayOrder, enabled);
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Experience getExperience() {
        return experience;
    }

    public ExperiencePlacementType getPlacementType() {
        return placementType;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public boolean isEnabled() {
        return enabled;
    }
}
