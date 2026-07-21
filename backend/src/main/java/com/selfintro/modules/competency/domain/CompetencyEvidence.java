package com.selfintro.modules.competency.domain;

import com.selfintro.modules.experience.domain.Experience;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "competency_evidence")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CompetencyEvidence {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "competency_id", nullable = false)
    private Competency competency;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "experience_id", nullable = false)
    private Experience experience;

    @Column(name = "evidence_summary", length = 700)
    private String evidenceSummary;

    @Column(name = "is_primary", nullable = false)
    private boolean primary;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    private CompetencyEvidence(
            Competency competency,
            Experience experience,
            String evidenceSummary,
            boolean primary,
            int displayOrder) {
        this.competency = competency;
        this.experience = experience;
        this.evidenceSummary =
                evidenceSummary == null || evidenceSummary.isBlank()
                        ? null
                        : evidenceSummary.trim();
        this.primary = primary;
        this.displayOrder = displayOrder;
    }

    static CompetencyEvidence create(
            Competency competency,
            Experience experience,
            String evidenceSummary,
            boolean primary,
            int displayOrder) {
        return new CompetencyEvidence(
                competency, experience, evidenceSummary, primary, displayOrder);
    }
}
