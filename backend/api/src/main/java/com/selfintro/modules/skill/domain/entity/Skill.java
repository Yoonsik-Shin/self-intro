package com.selfintro.modules.skill.domain.entity;

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

    @Column(name = "badge_key", length = 80)
    private String badgeKey;

    @Column(name = "badge_color", length = 6)
    private String badgeColor;

    @Column(name = "is_core", nullable = false)
    private boolean isCore;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    protected Skill() {
        // JPA standard constructor
    }

    private Skill(
            String name,
            String category,
            String skillLevel,
            String skillVersion,
            String comment,
            String usageType,
            String badgeKey,
            String badgeColor,
            boolean isCore,
            int displayOrder) {
        this.name = name;
        this.category = category;
        this.skillLevel = skillLevel;
        this.skillVersion = skillVersion;
        this.comment = comment;
        this.usageType = normalizeUsageType(usageType);
        this.badgeKey = normalizeBadgeValue(badgeKey);
        this.badgeColor = normalizeBadgeValue(badgeColor);
        this.isCore = isCore;
        this.displayOrder = displayOrder;
    }

    public static Skill create(
            String name, String category, String skillLevel, boolean isCore, int displayOrder) {
        return new Skill(
                name,
                category,
                skillLevel,
                null,
                null,
                "LEARNING",
                null,
                null,
                isCore,
                displayOrder);
    }

    public static Skill create(
            String name,
            String category,
            String skillLevel,
            String skillVersion,
            String comment,
            String usageType,
            boolean isCore,
            int displayOrder) {
        return new Skill(
                name,
                category,
                skillLevel,
                skillVersion,
                comment,
                usageType,
                null,
                null,
                isCore,
                displayOrder);
    }

    /** 플랫폼 공통 카탈로그에는 재사용 가능한 정적 정의만 저장한다. */
    public static Skill createCatalog(
            String name, String category, String badgeKey, String badgeColor) {
        return new Skill(
                name, category, null, null, null, "CATALOG", badgeKey, badgeColor, false, 0);
    }

    /** Workspace별 숙련도·버전·메모·노출 순서는 건드리지 않고 공통 정의만 변경한다. */
    public void updateCatalogDefinition(
            String name, String category, String badgeKey, String badgeColor) {
        this.name = name;
        this.category = category;
        this.badgeKey = normalizeBadgeValue(badgeKey);
        this.badgeColor = normalizeBadgeValue(badgeColor);
    }

    public static Skill create(
            String name,
            String category,
            String skillLevel,
            String skillVersion,
            String comment,
            String usageType,
            String badgeKey,
            String badgeColor,
            boolean isCore,
            int displayOrder) {
        return new Skill(
                name,
                category,
                skillLevel,
                skillVersion,
                comment,
                usageType,
                badgeKey,
                badgeColor,
                isCore,
                displayOrder);
    }

    public void update(
            String name,
            String category,
            String skillLevel,
            String skillVersion,
            String comment,
            String usageType,
            boolean isCore,
            int displayOrder) {
        update(
                name,
                category,
                skillLevel,
                skillVersion,
                comment,
                usageType,
                this.badgeKey,
                this.badgeColor,
                isCore,
                displayOrder);
    }

    public void update(
            String name,
            String category,
            String skillLevel,
            String skillVersion,
            String comment,
            String usageType,
            String badgeKey,
            String badgeColor,
            boolean isCore,
            int displayOrder) {
        this.name = name;
        this.category = category;
        this.skillLevel = skillLevel;
        this.skillVersion = skillVersion;
        this.comment = comment;
        this.usageType = normalizeUsageType(usageType);
        this.badgeKey = normalizeBadgeValue(badgeKey);
        this.badgeColor = normalizeBadgeValue(badgeColor);
        this.isCore = isCore;
        this.displayOrder = displayOrder;
    }

    private String normalizeUsageType(String usageType) {
        return usageType == null || usageType.isBlank() ? "LEARNING" : usageType;
    }

    private String normalizeBadgeValue(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    // Getters
    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getCategory() {
        return category;
    }

    public String getSkillLevel() {
        return skillLevel;
    }

    public String getSkillVersion() {
        return skillVersion;
    }

    public String getComment() {
        return comment;
    }

    public String getUsageType() {
        return usageType;
    }

    public String getBadgeKey() {
        return badgeKey;
    }

    public String getBadgeColor() {
        return badgeColor;
    }

    public boolean isCore() {
        return isCore;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }
}
