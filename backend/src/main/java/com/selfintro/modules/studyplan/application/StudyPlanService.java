package com.selfintro.modules.studyplan.application;

import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import com.selfintro.modules.learningresource.domain.repository.LearningResourceRepository;
import com.selfintro.modules.studyplan.application.StudyPlanAiService.GeneratedCheckQuestion;
import com.selfintro.modules.studyplan.application.StudyPlanAiService.GeneratedItem;
import com.selfintro.modules.studyplan.application.StudyPlanAiService.GeneratedPlan;
import com.selfintro.modules.studyplan.application.StudyPlanAiService.GeneratedStage;
import com.selfintro.modules.studyplan.domain.entity.StudyPlan;
import com.selfintro.modules.studyplan.domain.entity.StudyPlanCheckQuestion;
import com.selfintro.modules.studyplan.domain.entity.StudyPlanItem;
import com.selfintro.modules.studyplan.domain.entity.StudyPlanStage;
import com.selfintro.modules.studyplan.domain.enums.StudyPlanMessageRole;
import com.selfintro.modules.studyplan.domain.repository.StudyPlanRepository;
import com.selfintro.modules.studyplan.presentation.dto.StudyPlanResponse;
import com.selfintro.modules.studyplan.presentation.dto.StudyPlanSummaryResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * AI 학습 계획의 생성/재생성/확정/진행 체크를 관장한다. 재생성은 항상 계획 전체를 새로 만들어 교체하지만, 같은 학습 자료가 새 계획에도 남아 있으면 "학습
 * 완료"/"이해도 점검 완료" 체크는 그대로 이어받는다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudyPlanService {

    private final StudyPlanRepository studyPlanRepository;
    private final LearningResourceRepository learningResourceRepository;
    private final StudyPlanAiService studyPlanAiService;

    public List<StudyPlanSummaryResponse> list() {
        return studyPlanRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(StudyPlanSummaryResponse::from)
                .toList();
    }

    public StudyPlanResponse get(Long id) {
        return StudyPlanResponse.from(findOrThrow(id));
    }

    @Transactional
    public StudyPlanResponse create(int weeklyAvailableMinutes, String focusGoal) {
        LocalDateTime now = LocalDateTime.now();
        StudyPlan plan = StudyPlan.create(weeklyAvailableMinutes, focusGoal, now);
        GeneratedPlan generated =
                studyPlanAiService.generateInitial(weeklyAvailableMinutes, focusGoal);
        applyGeneratedPlan(plan, generated, Map.of(), now);
        plan.addMessage(
                StudyPlanMessageRole.USER,
                buildCreationSummary(weeklyAvailableMinutes, focusGoal),
                now);
        plan.addMessage(StudyPlanMessageRole.ASSISTANT, generated.assistantReply(), now);
        return StudyPlanResponse.from(studyPlanRepository.save(plan));
    }

    @Transactional
    public StudyPlanResponse sendMessage(Long id, String content) {
        StudyPlan plan = findOrThrow(id);
        if (plan.isConfirmed()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "확정된 계획입니다. 잠금 해제 후 다시 시도하세요.");
        }
        LocalDateTime now = LocalDateTime.now();
        Map<Long, CompletionState> snapshot = snapshotCompletion(plan);
        GeneratedPlan generated = studyPlanAiService.regenerate(plan, content);
        applyGeneratedPlan(plan, generated, snapshot, now);
        plan.addMessage(StudyPlanMessageRole.USER, content, now);
        plan.addMessage(StudyPlanMessageRole.ASSISTANT, generated.assistantReply(), now);
        return StudyPlanResponse.from(plan);
    }

    @Transactional
    public StudyPlanResponse confirm(Long id) {
        StudyPlan plan = findOrThrow(id);
        plan.confirm(LocalDateTime.now());
        return StudyPlanResponse.from(plan);
    }

    @Transactional
    public StudyPlanResponse unconfirm(Long id) {
        StudyPlan plan = findOrThrow(id);
        plan.unconfirm(LocalDateTime.now());
        return StudyPlanResponse.from(plan);
    }

    @Transactional
    public StudyPlanResponse toggleCompleted(Long planId, Long itemId) {
        StudyPlan plan = findOrThrow(planId);
        StudyPlanItem item = findItemOrThrow(plan, itemId);
        LocalDateTime now = LocalDateTime.now();
        item.markCompleted(!item.isCompleted(), now);
        return StudyPlanResponse.from(plan);
    }

    @Transactional
    public StudyPlanResponse toggleUnderstanding(Long planId, Long itemId) {
        StudyPlan plan = findOrThrow(planId);
        StudyPlanItem item = findItemOrThrow(plan, itemId);
        LocalDateTime now = LocalDateTime.now();
        item.markUnderstandingChecked(!item.isUnderstandingChecked(), now);
        return StudyPlanResponse.from(plan);
    }

    @Transactional
    public void delete(Long id) {
        studyPlanRepository.delete(findOrThrow(id));
    }

    private StudyPlan findOrThrow(Long id) {
        return studyPlanRepository.findById(id).orElseThrow(EntityNotFoundException::new);
    }

    private StudyPlanItem findItemOrThrow(StudyPlan plan, Long itemId) {
        return plan.getStages().stream()
                .flatMap(stage -> stage.getItems().stream())
                .filter(item -> item.getId().equals(itemId))
                .findFirst()
                .orElseThrow(EntityNotFoundException::new);
    }

    private String buildCreationSummary(int weeklyAvailableMinutes, String focusGoal) {
        StringBuilder sb = new StringBuilder();
        sb.append("주당 가용 시간 ").append(weeklyAvailableMinutes).append("분");
        if (focusGoal != null && !focusGoal.isBlank()) {
            sb.append(", 목표: ").append(focusGoal);
        }
        sb.append("으로 학습 계획을 생성해주세요.");
        return sb.toString();
    }

    private Map<Long, CompletionState> snapshotCompletion(StudyPlan plan) {
        Map<Long, CompletionState> snapshot = new HashMap<>();
        for (StudyPlanStage stage : plan.getStages()) {
            for (StudyPlanItem item : stage.getItems()) {
                Long resourceId = item.getLearningResourceId();
                if (resourceId == null) continue;
                snapshot.put(
                        resourceId,
                        new CompletionState(
                                item.isCompleted(),
                                item.getCompletedAt(),
                                item.isUnderstandingChecked(),
                                item.getUnderstandingCheckedAt()));
            }
        }
        return snapshot;
    }

    private void applyGeneratedPlan(
            StudyPlan plan,
            GeneratedPlan generated,
            Map<Long, CompletionState> snapshot,
            LocalDateTime now) {
        Set<Long> resourceIds =
                generated.stages().stream()
                        .flatMap(stage -> stage.items().stream())
                        .map(GeneratedItem::learningResourceId)
                        .filter(id -> id != null)
                        .collect(Collectors.toSet());
        Map<Long, LearningResource> resourceById =
                learningResourceRepository.findAllById(resourceIds).stream()
                        .collect(Collectors.toMap(LearningResource::getId, r -> r));

        List<StudyPlanStage> newStages = new ArrayList<>();
        for (GeneratedStage generatedStage : generated.stages()) {
            StudyPlanStage stage =
                    StudyPlanStage.create(
                            plan, generatedStage.stageOrder(), generatedStage.theme());
            int displayOrder = 0;
            for (GeneratedItem generatedItem : generatedStage.items()) {
                LearningResource resource =
                        generatedItem.learningResourceId() == null
                                ? null
                                : resourceById.get(generatedItem.learningResourceId());
                StudyPlanItem item =
                        StudyPlanItem.create(
                                stage,
                                resource,
                                generatedItem.freeTextLabel(),
                                generatedItem.allocatedMinutes(),
                                displayOrder++,
                                generatedItem.notes());
                if (resource != null && snapshot.containsKey(resource.getId())) {
                    CompletionState state = snapshot.get(resource.getId());
                    item.markCompleted(state.completed(), state.completedAt());
                    item.markUnderstandingChecked(
                            state.understandingChecked(), state.understandingCheckedAt());
                }
                int questionOrder = 0;
                for (GeneratedCheckQuestion question : generatedItem.checkQuestions()) {
                    item.getCheckQuestions()
                            .add(
                                    StudyPlanCheckQuestion.create(
                                            item,
                                            question.question(),
                                            question.modelAnswerHint(),
                                            questionOrder++));
                }
                stage.getItems().add(item);
            }
            newStages.add(stage);
        }
        plan.replaceStages(newStages, now);
    }

    private record CompletionState(
            boolean completed,
            LocalDateTime completedAt,
            boolean understandingChecked,
            LocalDateTime understandingCheckedAt) {}
}
