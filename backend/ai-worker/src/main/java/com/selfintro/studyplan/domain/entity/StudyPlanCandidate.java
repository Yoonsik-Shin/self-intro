package com.selfintro.studyplan.domain.entity;

import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * COLLECTING 단계에서 검색으로 찾은 학습 자료 후보 하나. {@code selected}는 체크박스 상태(계획 생성에 포함할지)이고, {@code familiar}는
 * 수집 시점에 내 스킬과 겹치는지 계산해 저장한 "이미 아는 개념" 표시라 이후 재계산하지 않는다.
 */
@Getter
@Entity
@Table(name = "study_plan_candidate")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StudyPlanCandidate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "study_plan_id", nullable = false)
    private StudyPlan studyPlan;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "learning_resource_id", nullable = false)
    private LearningResource learningResource;

    @Column(nullable = false)
    private boolean selected;

    @Column(nullable = false)
    private boolean familiar;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority_tier", length = 10)
    private LearningResourcePriorityTier priorityTier;

    private StudyPlanCandidate(
            StudyPlan studyPlan,
            LearningResource learningResource,
            boolean selected,
            boolean familiar,
            LearningResourcePriorityTier priorityTier) {
        this.studyPlan = studyPlan;
        this.learningResource = learningResource;
        this.selected = selected;
        this.familiar = familiar;
        this.priorityTier = priorityTier;
    }

    public static StudyPlanCandidate create(
            StudyPlan studyPlan,
            LearningResource learningResource,
            boolean selected,
            boolean familiar,
            LearningResourcePriorityTier priorityTier) {
        return new StudyPlanCandidate(
                studyPlan, learningResource, selected, familiar, priorityTier);
    }

    public Long getLearningResourceId() {
        return learningResource.getId();
    }

    public void setSelected(boolean selected) {
        this.selected = selected;
    }
}
