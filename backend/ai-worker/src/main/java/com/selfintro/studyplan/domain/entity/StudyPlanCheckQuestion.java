package com.selfintro.studyplan.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

/** 학습자료 항목(StudyPlanItem)마다 딸린 자유서술형 이해도 자가점검 질문. 채점하지 않고, modelAnswerHint는 참고용 힌트일 뿐이다. */
@Getter
@Entity
@Table(name = "study_plan_check_question")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StudyPlanCheckQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "study_plan_item_id", nullable = false)
    private StudyPlanItem item;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String question;

    @Column(name = "model_answer_hint", columnDefinition = "TEXT")
    private String modelAnswerHint;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    private StudyPlanCheckQuestion(
            StudyPlanItem item, String question, String modelAnswerHint, int displayOrder) {
        this.item = item;
        this.question = question;
        this.modelAnswerHint = modelAnswerHint;
        this.displayOrder = displayOrder;
    }

    public static StudyPlanCheckQuestion create(
            StudyPlanItem item, String question, String modelAnswerHint, int displayOrder) {
        return new StudyPlanCheckQuestion(item, question, modelAnswerHint, displayOrder);
    }
}
