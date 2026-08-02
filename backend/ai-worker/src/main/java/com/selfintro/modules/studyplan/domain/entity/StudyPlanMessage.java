package com.selfintro.modules.studyplan.domain.entity;

import com.selfintro.modules.studyplan.domain.enums.StudyPlanMessageRole;
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
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 계획을 다듬어가는 대화 이력 한 턴. 재생성 시 AI에게 넘기는 컨텍스트로도 쓰인다. */
@Getter
@Entity
@Table(name = "study_plan_message")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StudyPlanMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "study_plan_id", nullable = false)
    private StudyPlan studyPlan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StudyPlanMessageRole role;

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private StudyPlanMessage(
            StudyPlan studyPlan, StudyPlanMessageRole role, String content, LocalDateTime now) {
        this.studyPlan = studyPlan;
        this.role = role;
        this.content = content;
        this.createdAt = now;
    }

    public static StudyPlanMessage create(
            StudyPlan studyPlan, StudyPlanMessageRole role, String content, LocalDateTime now) {
        return new StudyPlanMessage(studyPlan, role, content, now);
    }
}
