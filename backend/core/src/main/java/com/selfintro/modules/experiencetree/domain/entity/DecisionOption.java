package com.selfintro.modules.experiencetree.domain.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "decision_option")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DecisionOption {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "situation_id", nullable = false)
    private DecisionSituation situation;

    @Column(name = "stable_key", nullable = false, unique = true, length = 160)
    private String stableKey;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 1000)
    private String summary;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String mechanism;

    @Column(name = "applicable_when", nullable = false, columnDefinition = "TEXT")
    private String applicableWhen;

    @Column(name = "avoid_when", nullable = false, columnDefinition = "TEXT")
    private String avoidWhen;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String advantages;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String disadvantages;

    @Column(name = "operational_notes", nullable = false, columnDefinition = "TEXT")
    private String operationalNotes;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    public static DecisionOption create(
            DecisionSituation situation,
            String stableKey,
            String title,
            String summary,
            String mechanism,
            String applicableWhen,
            String avoidWhen,
            String advantages,
            String disadvantages,
            String operationalNotes,
            int displayOrder) {
        DecisionOption value = new DecisionOption();
        value.situation = situation;
        value.stableKey = stableKey;
        value.title = title;
        value.summary = summary;
        value.mechanism = mechanism;
        value.applicableWhen = applicableWhen;
        value.avoidWhen = avoidWhen;
        value.advantages = advantages;
        value.disadvantages = disadvantages;
        value.operationalNotes = operationalNotes;
        value.displayOrder = displayOrder;
        return value;
    }

    public void update(
            DecisionSituation situation,
            String title,
            String summary,
            String mechanism,
            String applicableWhen,
            String avoidWhen,
            String advantages,
            String disadvantages,
            String operationalNotes,
            int displayOrder) {
        this.situation = situation;
        this.title = title;
        this.summary = summary;
        this.mechanism = mechanism;
        this.applicableWhen = applicableWhen;
        this.avoidWhen = avoidWhen;
        this.advantages = advantages;
        this.disadvantages = disadvantages;
        this.operationalNotes = operationalNotes;
        this.displayOrder = displayOrder;
    }
}
