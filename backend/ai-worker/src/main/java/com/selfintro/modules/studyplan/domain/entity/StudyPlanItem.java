package com.selfintro.modules.studyplan.domain.entity;

import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Stage 안에서 병렬로 진행해도 되는 학습 단위 하나. {@code learningResource}가 null이면 복습/버퍼 같은 자유 항목이고, 그 경우 {@code
 * freeTextLabel}이 채워진다. "학습 완료"({@code completed})와 "이해도 점검 완료"({@code understandingChecked})는 서로
 * 별개의 체크다.
 */
@Getter
@Entity
@Table(name = "study_plan_item")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StudyPlanItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "study_plan_stage_id", nullable = false)
    private StudyPlanStage stage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learning_resource_id")
    private LearningResource learningResource;

    @Column(name = "free_text_label", length = 200)
    private String freeTextLabel;

    @Column(name = "allocated_minutes", nullable = false)
    private int allocatedMinutes;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(nullable = false)
    private boolean completed;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "understanding_checked", nullable = false)
    private boolean understandingChecked;

    @Column(name = "understanding_checked_at")
    private LocalDateTime understandingCheckedAt;

    @Column(length = 500)
    private String notes;

    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    private List<StudyPlanCheckQuestion> checkQuestions = new ArrayList<>();

    private StudyPlanItem(
            StudyPlanStage stage,
            LearningResource learningResource,
            String freeTextLabel,
            int allocatedMinutes,
            int displayOrder,
            String notes) {
        this.stage = stage;
        this.learningResource = learningResource;
        this.freeTextLabel = freeTextLabel;
        this.allocatedMinutes = allocatedMinutes;
        this.displayOrder = displayOrder;
        this.notes = notes;
        this.completed = false;
        this.understandingChecked = false;
    }

    public static StudyPlanItem create(
            StudyPlanStage stage,
            LearningResource learningResource,
            String freeTextLabel,
            int allocatedMinutes,
            int displayOrder,
            String notes) {
        return new StudyPlanItem(
                stage, learningResource, freeTextLabel, allocatedMinutes, displayOrder, notes);
    }

    public Long getLearningResourceId() {
        return learningResource == null ? null : learningResource.getId();
    }

    public void markCompleted(boolean completed, LocalDateTime at) {
        this.completed = completed;
        this.completedAt = completed ? at : null;
    }

    public void markUnderstandingChecked(boolean checked, LocalDateTime at) {
        this.understandingChecked = checked;
        this.understandingCheckedAt = checked ? at : null;
    }
}
