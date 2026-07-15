package com.selfintro.study.entity;

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
@Table(name = "study_relation")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StudyRelation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "source_study_id", nullable = false)
    private Study source;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_study_id", nullable = false)
    private Study target;

    @Enumerated(EnumType.STRING)
    @Column(name = "relation_type", nullable = false, length = 30)
    private StudyRelationType type;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    private StudyRelation(Study source, Study target, StudyRelationType type, int displayOrder) {
        this.source = source;
        this.target = target;
        this.type = type;
        this.displayOrder = displayOrder;
    }

    public static StudyRelation create(Study source, Study target, StudyRelationType type, int displayOrder) {
        return new StudyRelation(source, target, type, displayOrder);
    }

    public boolean sameTargetAndType(StudyRelation other) {
        return target.getId().equals(other.target.getId()) && type == other.type;
    }

    public void updateDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }
}
