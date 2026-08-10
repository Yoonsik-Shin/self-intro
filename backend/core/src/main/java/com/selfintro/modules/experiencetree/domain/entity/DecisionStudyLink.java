package com.selfintro.modules.experiencetree.domain.entity;

import com.selfintro.modules.experiencetree.domain.enums.DecisionStudyRelationType;
import com.selfintro.modules.study.domain.entity.Study;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "decision_study_link")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DecisionStudyLink {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "situation_id", nullable = false)
    private DecisionSituation situation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "option_id")
    private DecisionOption option;

    @Column(name = "option_scope_key", nullable = false, length = 160)
    private String optionScopeKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "study_id", nullable = false)
    private Study study;

    @Enumerated(EnumType.STRING)
    @Column(name = "relation_type", nullable = false, length = 30)
    private DecisionStudyRelationType relationType;

    @Column(nullable = false, length = 1000)
    private String note;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "managed_by_catalog", nullable = false)
    private boolean managedByCatalog;

    @Column(name = "seed_key", length = 180)
    private String seedKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static DecisionStudyLink create(
            DecisionSituation situation,
            DecisionOption option,
            Study study,
            DecisionStudyRelationType relationType,
            String note,
            int displayOrder) {
        DecisionStudyLink value = new DecisionStudyLink();
        value.situation = situation;
        value.option = option;
        value.optionScopeKey = scopeKey(option);
        value.study = study;
        value.relationType = relationType;
        value.note = note == null ? "" : note;
        value.displayOrder = displayOrder;
        value.managedByCatalog = false;
        value.seedKey = null;
        value.createdAt = LocalDateTime.now();
        return value;
    }

    public static DecisionStudyLink createCatalog(
            String seedKey,
            DecisionSituation situation,
            DecisionOption option,
            Study study,
            DecisionStudyRelationType relationType,
            String note,
            int displayOrder) {
        DecisionStudyLink value =
                create(situation, option, study, relationType, note, displayOrder);
        value.managedByCatalog = true;
        value.seedKey = seedKey;
        return value;
    }

    public void update(
            DecisionOption option,
            DecisionStudyRelationType relationType,
            String note,
            int displayOrder) {
        this.option = option;
        this.optionScopeKey = scopeKey(option);
        this.relationType = relationType;
        this.note = note == null ? "" : note;
        this.displayOrder = displayOrder;
    }

    public void updateCatalog(
            String seedKey,
            DecisionSituation situation,
            DecisionOption option,
            Study study,
            DecisionStudyRelationType relationType,
            String note,
            int displayOrder) {
        this.situation = situation;
        this.option = option;
        this.optionScopeKey = scopeKey(option);
        this.study = study;
        this.relationType = relationType;
        this.note = note == null ? "" : note;
        this.displayOrder = displayOrder;
        this.managedByCatalog = true;
        this.seedKey = seedKey;
    }

    private static String scopeKey(DecisionOption option) {
        return option == null ? "__SITUATION__" : option.getStableKey();
    }
}
