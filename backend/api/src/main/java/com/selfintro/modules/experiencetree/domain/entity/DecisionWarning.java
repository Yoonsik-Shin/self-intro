package com.selfintro.modules.experiencetree.domain.entity;

import com.selfintro.modules.experiencetree.domain.enums.*;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "decision_warning")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DecisionWarning {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "situation_id", nullable = false)
    private DecisionSituation situation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "option_id")
    private DecisionOption option;

    @Column(name = "stable_key", nullable = false, unique = true, length = 160)
    private String stableKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private WarningClassification classification;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_type", nullable = false, length = 30)
    private WarningReasonType reasonType;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "failure_condition", nullable = false, columnDefinition = "TEXT")
    private String failureCondition;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String consequence;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String correction;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WarningSeverity severity;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    public static DecisionWarning create(
            DecisionSituation situation,
            DecisionOption option,
            String stableKey,
            WarningClassification classification,
            WarningReasonType reasonType,
            String title,
            String description,
            String failureCondition,
            String consequence,
            String correction,
            WarningSeverity severity,
            int displayOrder) {
        DecisionWarning value = new DecisionWarning();
        value.situation = situation;
        value.option = option;
        value.stableKey = stableKey;
        value.classification = classification;
        value.reasonType = reasonType;
        value.title = title;
        value.description = description;
        value.failureCondition = failureCondition;
        value.consequence = consequence;
        value.correction = correction;
        value.severity = severity;
        value.displayOrder = displayOrder;
        return value;
    }

    public void update(
            DecisionSituation situation,
            DecisionOption option,
            WarningClassification classification,
            WarningReasonType reasonType,
            String title,
            String description,
            String failureCondition,
            String consequence,
            String correction,
            WarningSeverity severity,
            int displayOrder) {
        this.situation = situation;
        this.option = option;
        this.classification = classification;
        this.reasonType = reasonType;
        this.title = title;
        this.description = description;
        this.failureCondition = failureCondition;
        this.consequence = consequence;
        this.correction = correction;
        this.severity = severity;
        this.displayOrder = displayOrder;
    }
}
