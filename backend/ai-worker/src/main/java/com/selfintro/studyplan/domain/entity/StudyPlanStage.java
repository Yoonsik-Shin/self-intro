package com.selfintro.studyplan.domain.entity;

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
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 계획의 순차 단계 하나. 같은 Stage 안 항목들은 서로 선후관계가 없어 병렬로 진행해도 되고, Stage 자체는 {@code stageOrder} 순서대로 진행한다.
 * {@code theme}은 AI가 카테고리/성격을 근거로 붙이는 의미 있는 묶음 이름(예: "기본기 다지기")이라 그룹핑의 핵심 축이므로 필수값이다.
 */
@Getter
@Entity
@Table(name = "study_plan_stage")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StudyPlanStage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "study_plan_id", nullable = false)
    private StudyPlan studyPlan;

    @Column(name = "stage_order", nullable = false)
    private int stageOrder;

    @Column(nullable = false, length = 200)
    private String theme;

    @OneToMany(mappedBy = "stage", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    private List<StudyPlanItem> items = new ArrayList<>();

    private StudyPlanStage(StudyPlan studyPlan, int stageOrder, String theme) {
        this.studyPlan = studyPlan;
        this.stageOrder = stageOrder;
        this.theme = theme;
    }

    public static StudyPlanStage create(StudyPlan studyPlan, int stageOrder, String theme) {
        return new StudyPlanStage(studyPlan, stageOrder, theme);
    }

    public int getTotalAllocatedMinutes() {
        return items.stream().mapToInt(StudyPlanItem::getAllocatedMinutes).sum();
    }
}
