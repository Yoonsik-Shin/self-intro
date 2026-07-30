package com.selfintro.modules.studyplan.domain.entity;

import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import com.selfintro.modules.studyplan.domain.enums.StudyPlanMessageRole;
import com.selfintro.modules.studyplan.domain.enums.StudyPlanStatus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
 * 수집된 학습 자료를 순서(선후관계)와 병렬 가능 여부를 지키는 테마 단계(Stage)들로 묶어주는 AI 생성 학습 계획. 대화형 피드백으로 재생성을 거듭하다가 {@link
 * #confirm()}으로 잠근다.
 */
@Getter
@Entity
@Table(name = "study_plan")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StudyPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StudyPlanStatus status;

    @Column(name = "weekly_available_minutes", nullable = false)
    private int weeklyAvailableMinutes;

    @Column(name = "focus_goal", length = 1000)
    private String focusGoal;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @OneToMany(mappedBy = "studyPlan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("stageOrder ASC")
    private List<StudyPlanStage> stages = new ArrayList<>();

    @OneToMany(mappedBy = "studyPlan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<StudyPlanMessage> messages = new ArrayList<>();

    /** 채팅으로 좁힌, 계획 생성에 쓸 학습자료 후보. {@link #generate}로 Stage/Item을 만들기 전까지 이 목록만 존재한다. */
    @OneToMany(mappedBy = "studyPlan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<StudyPlanCandidate> candidates = new ArrayList<>();

    private StudyPlan(int weeklyAvailableMinutes, String focusGoal, LocalDateTime now) {
        this.status = StudyPlanStatus.COLLECTING;
        this.weeklyAvailableMinutes = weeklyAvailableMinutes;
        this.focusGoal = focusGoal;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static StudyPlan create(
            int weeklyAvailableMinutes, String focusGoal, LocalDateTime now) {
        return new StudyPlan(weeklyAvailableMinutes, focusGoal, now);
    }

    public void replaceCandidates(List<StudyPlanCandidate> newCandidates, LocalDateTime now) {
        candidates.clear();
        candidates.addAll(newCandidates);
        this.updatedAt = now;
    }

    /** 계획 생성({@link StudyPlanAiService#generateInitial})에 실제로 넘길, 체크박스로 선택된 자료만 뽑는다. */
    public List<LearningResource> getSelectedResources() {
        return candidates.stream()
                .filter(StudyPlanCandidate::isSelected)
                .map(StudyPlanCandidate::getLearningResource)
                .toList();
    }

    public void replaceStages(List<StudyPlanStage> newStages, LocalDateTime now) {
        stages.clear();
        stages.addAll(newStages);
        this.updatedAt = now;
    }

    public void addMessage(StudyPlanMessageRole role, String content, LocalDateTime now) {
        messages.add(StudyPlanMessage.create(this, role, content, now));
    }

    /** COLLECTING 단계에서 확정된 candidates로 최초 계획(Stage/Item)이 만들어졌을 때 호출 — DRAFT로 전환. */
    public void markGenerated(LocalDateTime now) {
        this.status = StudyPlanStatus.DRAFT;
        this.updatedAt = now;
    }

    public void confirm(LocalDateTime now) {
        this.status = StudyPlanStatus.CONFIRMED;
        this.confirmedAt = now;
        this.updatedAt = now;
    }

    public void unconfirm(LocalDateTime now) {
        this.status = StudyPlanStatus.DRAFT;
        this.confirmedAt = null;
        this.updatedAt = now;
    }

    public boolean isCollecting() {
        return status == StudyPlanStatus.COLLECTING;
    }

    public boolean isConfirmed() {
        return status == StudyPlanStatus.CONFIRMED;
    }
}
