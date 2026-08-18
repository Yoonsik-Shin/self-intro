package com.selfintro.modules.experience.domain.entity;

import com.selfintro.modules.experience.domain.enums.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "experience_placement_detail",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uk_experience_placement_detail",
                        columnNames = {"placement_id", "experience_detail_id"}))
public class ExperiencePlacementDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "placement_id", nullable = false)
    private ExperiencePlacement placement;

    @Column(name = "experience_id", nullable = false, updatable = false)
    private Long experienceId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "experience_detail_id", nullable = false)
    private ExperienceDetail detail;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected ExperiencePlacementDetail() {}

    private ExperiencePlacementDetail(
            ExperiencePlacement placement, ExperienceDetail detail, int displayOrder) {
        this.placement = placement;
        this.experienceId = placement.getExperience().getId();
        this.detail = detail;
        this.displayOrder = displayOrder;
    }

    public static ExperiencePlacementDetail create(
            ExperiencePlacement placement, ExperienceDetail detail, int displayOrder) {
        return new ExperiencePlacementDetail(placement, detail, displayOrder);
    }

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public ExperiencePlacement getPlacement() {
        return placement;
    }

    public Long getExperienceId() {
        return experienceId;
    }

    public ExperienceDetail getDetail() {
        return detail;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }
}
