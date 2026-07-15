package com.selfintro.modules.competency.domain;

import com.selfintro.study.entity.Study;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "competency_study")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CompetencyStudy {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "competency_id", nullable = false)
    private Competency competency;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "study_id", nullable = false)
    private Study study;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    private CompetencyStudy(Competency competency, Study study, int displayOrder) {
        this.competency = competency;
        this.study = study;
        this.displayOrder = displayOrder;
    }

    static CompetencyStudy create(Competency competency, Study study, int displayOrder) {
        return new CompetencyStudy(competency, study, displayOrder);
    }
}
