package com.selfintro.study.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "study_image")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StudyImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "object_key", nullable = false, length = 300)
    private String objectKey;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private StudyImage(String objectKey, int displayOrder) {
        this.objectKey = objectKey;
        this.displayOrder = displayOrder;
        this.createdAt = LocalDateTime.now();
    }

    public static StudyImage create(String objectKey, int displayOrder) {
        return new StudyImage(objectKey, displayOrder);
    }

    /**
     * Incoming image data from a request, before it's known whether it maps to a new row or an
     * existing one. {@code id} is null for a newly uploaded image; non-null lets {@link Study}
     * match it against an existing {@link StudyImage} so that row keeps its identity instead of
     * being deleted and re-inserted.
     */
    public record Draft(Long id, String objectKey, int displayOrder) {
    }

    public void updateDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }
}
