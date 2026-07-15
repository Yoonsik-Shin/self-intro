package com.selfintro.modules.experience.domain;

import com.selfintro.modules.skill.domain.Skill;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "experience_detail")
public class ExperienceDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "experience_id", insertable = false, updatable = false)
    private Experience experience;

    @Column(nullable = false, length = 500)
    private String content;

    @Column(columnDefinition = "TEXT")
    private String situation;

    @Column(name = "action_detail", columnDefinition = "TEXT")
    private String actionDetail;

    @Column(columnDefinition = "TEXT")
    private String outcome;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "experience_detail_skill",
        joinColumns = @JoinColumn(name = "experience_detail_id"),
        inverseJoinColumns = @JoinColumn(name = "skill_id")
    )
    @OrderColumn(name = "list_order")
    private List<Skill> skills = new ArrayList<>();

    protected ExperienceDetail() {
        // JPA standard constructor
    }

    private ExperienceDetail(Long id, String content, String situation, String actionDetail, String outcome, int displayOrder, List<Skill> skills) {
        this.id = id;
        this.content = content;
        this.situation = situation;
        this.actionDetail = actionDetail;
        this.outcome = outcome;
        this.displayOrder = displayOrder;
        this.skills = skills != null ? skills : new ArrayList<>();
    }

    public static ExperienceDetail create(String content, String situation, String actionDetail, String outcome, int displayOrder, List<Skill> skills) {
        return new ExperienceDetail(null, content, situation, actionDetail, outcome, displayOrder, skills);
    }

    /**
     * Incoming detail data from a request, before it's known whether it maps to a new row or an
     * existing one. {@code id} is null for a new bullet; non-null lets {@link Experience} match it
     * against an existing {@link ExperienceDetail} so that row keeps its identity instead of being
     * deleted and re-inserted.
     */
    public record Draft(Long id, String content, String situation, String actionDetail, String outcome, int displayOrder, List<Skill> skills) {}

    public void update(String content, String situation, String actionDetail, String outcome, int displayOrder, List<Skill> skills) {
        this.content = content;
        this.situation = situation;
        this.actionDetail = actionDetail;
        this.outcome = outcome;
        this.displayOrder = displayOrder;

        this.skills.clear();
        if (skills != null) {
            this.skills.addAll(skills);
        }
    }

    public void setSkillLinked(Skill skill, boolean linked) {
        boolean alreadyLinked = skills.stream().anyMatch(value -> value.getId().equals(skill.getId()));
        if (linked && !alreadyLinked) {
            skills.add(skill);
        } else if (!linked && alreadyLinked) {
            skills.removeIf(value -> value.getId().equals(skill.getId()));
        }
    }

    // Getters
    public Long getId() { return id; }
    public Experience getExperience() { return experience; }
    public String getContent() { return content; }
    public String getSituation() { return situation; }
    public String getActionDetail() { return actionDetail; }
    public String getOutcome() { return outcome; }
    public int getDisplayOrder() { return displayOrder; }
    public List<Skill> getSkills() { return skills; }
}
