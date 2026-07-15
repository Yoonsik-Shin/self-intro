package com.selfintro.modules.experience.domain;

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
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name = "experience_relation",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_experience_relation",
        columnNames = {"source_experience_id", "target_experience_id", "relation_type"}
    )
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ExperienceRelation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "source_experience_id", nullable = false)
    private Experience source;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_experience_id", nullable = false)
    private Experience target;

    @Enumerated(EnumType.STRING)
    @Column(name = "relation_type", nullable = false, length = 30)
    private ExperienceRelationType type;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    private ExperienceRelation(Experience source, Experience target, ExperienceRelationType type, int displayOrder) {
        this.source = source;
        this.target = target;
        this.type = type;
        this.displayOrder = displayOrder;
    }

    public static ExperienceRelation create(
        Experience source,
        Experience target,
        ExperienceRelationType type,
        int displayOrder
    ) {
        return new ExperienceRelation(source, target, type, displayOrder);
    }
}
