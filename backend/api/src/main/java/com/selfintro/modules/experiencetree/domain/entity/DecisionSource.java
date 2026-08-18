package com.selfintro.modules.experiencetree.domain.entity;

import com.selfintro.modules.experiencetree.domain.enums.DecisionSourceType;
import jakarta.persistence.*;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "decision_source")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DecisionSource {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "situation_id", nullable = false)
    private DecisionSituation situation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "option_id")
    private DecisionOption option;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warning_id")
    private DecisionWarning warning;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 40)
    private DecisionSourceType sourceType;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(nullable = false, length = 1000)
    private String url;

    @Column(nullable = false, length = 200)
    private String publisher;

    @Column(name = "applicable_version", length = 120)
    private String applicableVersion;

    @Column(name = "accessed_at", nullable = false)
    private LocalDate accessedAt;

    @Column(nullable = false, length = 1000)
    private String note;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    public static DecisionSource create(
            DecisionSituation situation,
            DecisionOption option,
            DecisionWarning warning,
            DecisionSourceType sourceType,
            String title,
            String url,
            String publisher,
            String applicableVersion,
            LocalDate accessedAt,
            String note,
            int displayOrder) {
        DecisionSource value = new DecisionSource();
        value.situation = situation;
        value.option = option;
        value.warning = warning;
        value.sourceType = sourceType;
        value.title = title;
        value.url = url;
        value.publisher = publisher;
        value.applicableVersion = applicableVersion;
        value.accessedAt = accessedAt;
        value.note = note;
        value.displayOrder = displayOrder;
        return value;
    }
}
