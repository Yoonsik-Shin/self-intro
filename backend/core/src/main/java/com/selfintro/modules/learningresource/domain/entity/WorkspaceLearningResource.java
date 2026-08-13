package com.selfintro.modules.learningresource.domain.entity;

import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import com.selfintro.modules.study.domain.entity.Tag;
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
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.BatchSize;

@Getter
@Entity
@Table(name = "workspace_learning_resource")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspaceLearningResource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workspace_id", nullable = false)
    private Long workspaceId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "learning_resource_id", nullable = false)
    private LearningResource learningResource;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LearningResourceStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority_tier", length = 10)
    private LearningResourcePriorityTier priorityTier;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "personal_summary", length = 500)
    private String personalSummary;

    @Column(name = "personal_note_markdown", columnDefinition = "LONGTEXT")
    private String personalNoteMarkdown;

    @BatchSize(size = 100)
    @ManyToMany
    @JoinTable(
            name = "workspace_learning_resource_tag",
            joinColumns = @JoinColumn(name = "workspace_learning_resource_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    @OrderBy("name ASC")
    private List<Tag> tags = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static WorkspaceLearningResource create(
            Long workspaceId,
            LearningResource learningResource,
            LearningResourceStatus status,
            LearningResourcePriorityTier priorityTier,
            int displayOrder,
            String personalSummary,
            String personalNoteMarkdown) {
        WorkspaceLearningResource overlay = new WorkspaceLearningResource();
        overlay.workspaceId = workspaceId;
        overlay.learningResource = learningResource;
        overlay.createdAt = LocalDateTime.now();
        overlay.update(status, priorityTier, displayOrder, personalSummary, personalNoteMarkdown);
        return overlay;
    }

    public void update(
            LearningResourceStatus status,
            LearningResourcePriorityTier priorityTier,
            int displayOrder,
            String personalSummary,
            String personalNoteMarkdown) {
        this.status = status == null ? LearningResourceStatus.WISHLIST : status;
        this.priorityTier = priorityTier;
        this.displayOrder = displayOrder;
        this.personalSummary = personalSummary;
        this.personalNoteMarkdown = personalNoteMarkdown;
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
}
