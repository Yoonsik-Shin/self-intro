package com.selfintro.modules.learningresource.domain.entity;

import com.selfintro.modules.learningresource.domain.enums.LearningResourceRelationType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "learning_resource_relation")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LearningResourceRelation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "source_resource_id", nullable = false)
    private LearningResource source;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_resource_id", nullable = false)
    private LearningResource target;

    @Enumerated(EnumType.STRING)
    @Column(name = "relation_type", nullable = false, length = 30)
    private LearningResourceRelationType type;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    private LearningResourceRelation(
            LearningResource source,
            LearningResource target,
            LearningResourceRelationType type,
            int displayOrder) {
        this.source = source;
        this.target = target;
        this.type = type;
        this.displayOrder = displayOrder;
    }

    public static LearningResourceRelation create(
            LearningResource source,
            LearningResource target,
            LearningResourceRelationType type,
            int displayOrder) {
        return new LearningResourceRelation(source, target, type, displayOrder);
    }

    public boolean sameTargetAndType(LearningResourceRelation other) {
        return target.getId().equals(other.target.getId()) && type == other.type;
    }

    public void updateDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }
}
