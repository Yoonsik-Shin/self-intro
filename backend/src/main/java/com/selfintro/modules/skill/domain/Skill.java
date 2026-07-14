package com.selfintro.modules.skill.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "skill")
public class Skill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String name;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(name = "skill_level", length = 40)
    private String skillLevel;

    @Column(name = "is_core", nullable = false)
    private boolean isCore;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    protected Skill() {
        // JPA standard constructor
    }

    private Skill(String name, String category, String skillLevel, boolean isCore, int displayOrder) {
        this.name = name;
        this.category = category;
        this.skillLevel = skillLevel;
        this.isCore = isCore;
        this.displayOrder = displayOrder;
    }

    public static Skill create(String name, String category, String skillLevel, boolean isCore, int displayOrder) {
        return new Skill(name, category, skillLevel, isCore, displayOrder);
    }

    public void update(String name, String category, String skillLevel, boolean isCore, int displayOrder) {
        this.name = name;
        this.category = category;
        this.skillLevel = skillLevel;
        this.isCore = isCore;
        this.displayOrder = displayOrder;
    }

    // Getters
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getCategory() { return category; }
    public String getSkillLevel() { return skillLevel; }
    public boolean isCore() { return isCore; }
    public int getDisplayOrder() { return displayOrder; }
}
