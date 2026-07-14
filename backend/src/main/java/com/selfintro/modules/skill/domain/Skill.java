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

    @Column(name = "skill_version", length = 60)
    private String skillVersion;

    @Column(name = "skill_comment", length = 500)
    private String comment;

    @Column(name = "usage_type", nullable = false, length = 30)
    private String usageType = "LEARNING";

    @Column(name = "is_core", nullable = false)
    private boolean isCore;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    protected Skill() {
        // JPA standard constructor
    }

    private Skill(String name, String category, String skillLevel, String skillVersion, String comment, String usageType, boolean isCore, int displayOrder) {
        this.name = name;
        this.category = category;
        this.skillLevel = skillLevel;
        this.skillVersion = skillVersion;
        this.comment = comment;
        this.usageType = normalizeUsageType(usageType);
        this.isCore = isCore;
        this.displayOrder = displayOrder;
    }

    public static Skill create(String name, String category, String skillLevel, boolean isCore, int displayOrder) {
        return new Skill(name, category, skillLevel, null, null, "LEARNING", isCore, displayOrder);
    }

    public static Skill create(String name, String category, String skillLevel, String skillVersion, String comment, String usageType, boolean isCore, int displayOrder) {
        return new Skill(name, category, skillLevel, skillVersion, comment, usageType, isCore, displayOrder);
    }

    public void update(String name, String category, String skillLevel, String skillVersion, String comment, String usageType, boolean isCore, int displayOrder) {
        this.name = name;
        this.category = category;
        this.skillLevel = skillLevel;
        this.skillVersion = skillVersion;
        this.comment = comment;
        this.usageType = normalizeUsageType(usageType);
        this.isCore = isCore;
        this.displayOrder = displayOrder;
    }

    private String normalizeUsageType(String usageType) {
        return usageType == null || usageType.isBlank() ? "LEARNING" : usageType;
    }

    // Getters
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getCategory() { return category; }
    public String getSkillLevel() { return skillLevel; }
    public String getSkillVersion() { return skillVersion; }
    public String getComment() { return comment; }
    public String getUsageType() { return usageType; }
    public boolean isCore() { return isCore; }
    public int getDisplayOrder() { return displayOrder; }
}
