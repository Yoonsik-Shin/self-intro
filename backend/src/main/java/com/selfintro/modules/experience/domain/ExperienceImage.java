package com.selfintro.modules.experience.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "experience_image")
public class ExperienceImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "object_key", nullable = false, length = 300)
    private String objectKey;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected ExperienceImage() {
        // JPA standard constructor
    }

    private ExperienceImage(String objectKey, int displayOrder) {
        this.objectKey = objectKey;
        this.displayOrder = displayOrder;
        this.createdAt = LocalDateTime.now();
    }

    public static ExperienceImage create(String objectKey, int displayOrder) {
        return new ExperienceImage(objectKey, displayOrder);
    }

    /**
     * Incoming image data from a request, before it's known whether it maps to a new row or an
     * existing one. {@code id} is null for a newly uploaded image; non-null lets {@link Experience}
     * match it against an existing {@link ExperienceImage} so that row keeps its identity instead of
     * being deleted and re-inserted.
     */
    public record Draft(Long id, String objectKey, int displayOrder) {
    }

    public void updateDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }

    public Long getId() {
        return id;
    }

    public String getObjectKey() {
        return objectKey;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }
}
