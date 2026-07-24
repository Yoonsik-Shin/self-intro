package com.selfintro.modules.competency.domain;

import com.selfintro.modules.experience.domain.Experience;
import com.selfintro.modules.skill.domain.Skill;
import com.selfintro.study.entity.Study;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "competency")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Competency {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 500)
    private String summary;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "is_visible", nullable = false)
    private boolean visible;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "competency", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    private List<CompetencySkill> skillLinks = new ArrayList<>();

    @OneToMany(mappedBy = "competency", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    private List<CompetencyEvidence> evidences = new ArrayList<>();

    @OneToMany(mappedBy = "competency", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    private List<CompetencyStudy> studyLinks = new ArrayList<>();

    private Competency(String title, String summary, int displayOrder, boolean visible) {
        this.title = title;
        this.summary = summary;
        this.displayOrder = displayOrder;
        this.visible = visible;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = createdAt;
    }

    public static Competency create(
            String title, String summary, int displayOrder, boolean visible) {
        return new Competency(title, summary, displayOrder, visible);
    }

    public void update(String title, String summary, int displayOrder, boolean visible) {
        this.title = title;
        this.summary = summary;
        this.displayOrder = displayOrder;
        this.visible = visible;
        this.updatedAt = LocalDateTime.now();
    }

    public void changeVisibility(boolean visible) {
        this.visible = visible;
        this.updatedAt = LocalDateTime.now();
    }

    public void replaceSkills(List<Skill> skills) {
        skillLinks.clear();
        for (int i = 0; i < skills.size(); i++) {
            skillLinks.add(CompetencySkill.create(this, skills.get(i), i));
        }
    }

    public void replaceEvidences(List<EvidenceDraft> drafts) {
        evidences.clear();
        drafts.stream()
                .sorted(Comparator.comparingInt(EvidenceDraft::displayOrder))
                .forEach(
                        draft ->
                                evidences.add(
                                        CompetencyEvidence.create(
                                                this,
                                                draft.experience(),
                                                draft.evidenceSummary(),
                                                draft.primary(),
                                                draft.displayOrder())));
    }

    public void replaceStudies(List<Study> studies) {
        studyLinks.clear();
        for (int i = 0; i < studies.size(); i++) {
            studyLinks.add(CompetencyStudy.create(this, studies.get(i), i));
        }
    }

    public record EvidenceDraft(
            Experience experience, String evidenceSummary, boolean primary, int displayOrder) {}
}
