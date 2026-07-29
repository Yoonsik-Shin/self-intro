package com.selfintro.modules.learningresource.domain.entity;

import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;
import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.study.domain.entity.Tag;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "learning_resource")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LearningResource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 160)
    private String slug;

    @Column(nullable = false, length = 160)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "resource_type", nullable = false, length = 20)
    private LearningResourceType resourceType;

    @Column(length = 120)
    private String provider;

    @Column(length = 500)
    private String url;

    @Column(name = "instructor_or_author", length = 120)
    private String instructorOrAuthor;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LearningResourceStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority_tier", length = 10)
    private LearningResourcePriorityTier priorityTier;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private LearningResourceCategory category;

    @Column(length = 500)
    private String summary;

    @Column(name = "detail_markdown", columnDefinition = "LONGTEXT")
    private String detailMarkdown;

    @ManyToMany
    @JoinTable(
            name = "learning_resource_tag",
            joinColumns = @JoinColumn(name = "learning_resource_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    @OrderBy("name ASC")
    private List<Tag> tags = new ArrayList<>();

    @ManyToMany
    @JoinTable(
            name = "learning_resource_skill",
            joinColumns = @JoinColumn(name = "learning_resource_id"),
            inverseJoinColumns = @JoinColumn(name = "skill_id"))
    @OrderBy("displayOrder ASC")
    private List<Skill> skills = new ArrayList<>();

    @OneToMany(mappedBy = "source", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    private List<LearningResourceRelation> relations = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private LearningResource(
            String slug,
            String title,
            LearningResourceType resourceType,
            String provider,
            String url,
            String instructorOrAuthor,
            Integer durationMinutes,
            LearningResourceStatus status,
            LearningResourcePriorityTier priorityTier,
            int displayOrder,
            LearningResourceCategory category,
            String summary,
            String detailMarkdown) {
        this.slug = slug;
        this.title = title;
        this.resourceType = resourceType;
        this.provider = provider;
        this.url = url;
        this.instructorOrAuthor = instructorOrAuthor;
        this.durationMinutes = durationMinutes;
        this.status = status;
        this.priorityTier = priorityTier;
        this.displayOrder = displayOrder;
        this.category = category;
        this.summary = summary;
        this.detailMarkdown = detailMarkdown;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    public static LearningResource create(
            String slug,
            String title,
            LearningResourceType resourceType,
            String provider,
            String url,
            String instructorOrAuthor,
            Integer durationMinutes,
            LearningResourceStatus status,
            LearningResourcePriorityTier priorityTier,
            int displayOrder,
            LearningResourceCategory category,
            String summary,
            String detailMarkdown) {
        return new LearningResource(
                slug,
                title,
                resourceType,
                provider,
                url,
                instructorOrAuthor,
                durationMinutes,
                status,
                priorityTier,
                displayOrder,
                category,
                summary,
                detailMarkdown);
    }

    public void update(
            String slug,
            String title,
            LearningResourceType resourceType,
            String provider,
            String url,
            String instructorOrAuthor,
            Integer durationMinutes,
            LearningResourceStatus status,
            LearningResourcePriorityTier priorityTier,
            int displayOrder,
            LearningResourceCategory category,
            String summary,
            String detailMarkdown) {
        this.slug = slug;
        this.title = title;
        this.resourceType = resourceType;
        this.provider = provider;
        this.url = url;
        this.instructorOrAuthor = instructorOrAuthor;
        this.durationMinutes = durationMinutes;
        this.status = status;
        this.priorityTier = priorityTier;
        this.displayOrder = displayOrder;
        this.category = category;
        this.summary = summary;
        this.detailMarkdown = detailMarkdown;
        this.updatedAt = LocalDateTime.now();
    }

    public void updateStatus(LearningResourceStatus status) {
        this.status = status;
        this.updatedAt = LocalDateTime.now();
    }

    public void replaceTags(Collection<Tag> values) {
        tags.clear();
        tags.addAll(values);
    }

    public void replaceSkills(Collection<Skill> values) {
        skills.clear();
        skills.addAll(values);
    }

    public void replaceRelations(Collection<LearningResourceRelation> values) {
        relations.removeIf(
                existing ->
                        values.stream()
                                .noneMatch(incoming -> existing.sameTargetAndType(incoming)));
        for (LearningResourceRelation incoming : values) {
            relations.stream()
                    .filter(existing -> existing.sameTargetAndType(incoming))
                    .findFirst()
                    .ifPresentOrElse(
                            existing -> existing.updateDisplayOrder(incoming.getDisplayOrder()),
                            () -> relations.add(incoming));
        }
        relations.sort(
                java.util.Comparator.comparingInt(LearningResourceRelation::getDisplayOrder));
    }
}
