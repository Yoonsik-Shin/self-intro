package com.selfintro.modules.competency.domain;

import com.selfintro.modules.skill.domain.Skill;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "competency_skill")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CompetencySkill {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "competency_id", nullable = false)
    private Competency competency;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    private CompetencySkill(Competency competency, Skill skill, int displayOrder) {
        this.competency = competency;
        this.skill = skill;
        this.displayOrder = displayOrder;
    }

    static CompetencySkill create(Competency competency, Skill skill, int displayOrder) {
        return new CompetencySkill(competency, skill, displayOrder);
    }
}
