package com.selfintro.modules.experiencetree.domain.entity;

import com.selfintro.modules.experiencetree.domain.enums.TradeoffCriterion;
import com.selfintro.modules.experiencetree.domain.enums.TradeoffLevel;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "decision_tradeoff")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DecisionTradeoff {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "option_id", nullable = false)
    private DecisionOption option;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TradeoffCriterion criterion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TradeoffLevel level;

    @Column(nullable = false, length = 1200)
    private String explanation;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    public static DecisionTradeoff create(
            DecisionOption option,
            TradeoffCriterion criterion,
            TradeoffLevel level,
            String explanation,
            int displayOrder) {
        DecisionTradeoff value = new DecisionTradeoff();
        value.option = option;
        value.criterion = criterion;
        value.level = level;
        value.explanation = explanation;
        value.displayOrder = displayOrder;
        return value;
    }

    public void update(TradeoffLevel level, String explanation, int displayOrder) {
        this.level = level;
        this.explanation = explanation;
        this.displayOrder = displayOrder;
    }
}
