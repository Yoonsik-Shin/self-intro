package com.selfintro.modules.experiencetree.domain.entity;

import com.selfintro.modules.experiencetree.domain.enums.DecisionSituationRelationType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "decision_situation_relation")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DecisionSituationRelation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_situation_id", nullable = false)
    private DecisionSituation source;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_situation_id", nullable = false)
    private DecisionSituation target;

    @Enumerated(EnumType.STRING)
    @Column(name = "relation_type", nullable = false, length = 30)
    private DecisionSituationRelationType relationType;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    public static DecisionSituationRelation create(
            DecisionSituation source,
            DecisionSituation target,
            DecisionSituationRelationType relationType,
            int displayOrder) {
        DecisionSituationRelation value = new DecisionSituationRelation();
        value.source = source;
        value.target = target;
        value.relationType = relationType;
        value.displayOrder = displayOrder;
        return value;
    }

    public void update(int displayOrder) {
        this.displayOrder = displayOrder;
    }
}
