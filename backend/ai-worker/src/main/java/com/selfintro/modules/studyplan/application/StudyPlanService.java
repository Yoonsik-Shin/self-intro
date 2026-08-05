package com.selfintro.modules.studyplan.application;

import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import com.selfintro.modules.learningresource.domain.repository.LearningResourceRepository;
import com.selfintro.modules.studyplan.application.StudyPlanAiService.GeneratedCheckQuestion;
import com.selfintro.modules.studyplan.application.StudyPlanAiService.GeneratedItem;
import com.selfintro.modules.studyplan.application.StudyPlanAiService.GeneratedPlan;
import com.selfintro.modules.studyplan.application.StudyPlanAiService.GeneratedStage;
import com.selfintro.modules.studyplan.application.StudyPlanRetrievalService.CollectedCandidate;
import com.selfintro.modules.studyplan.domain.entity.StudyPlan;
import com.selfintro.modules.studyplan.domain.entity.StudyPlanCandidate;
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
import java.util.LinkedHashMap;
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
 * AI 학습 계획의 후보 수집/조정/생성/재생성/확정/진행 체크를 관장한다.
 *
 * <p>계획은 두 단계를 거친다: (1) {@code COLLECTING} — 채팅으로 학습자료 후보를 좁히는 단계, Stage/Item은 아직 없다. (2) {@code
 * DRAFT}/{@code CONFIRMED} — {@link #generatePlan}으로 후보가 확정된 뒤 실제 Stage/Item이 생긴 단계. 재생성은 항상 계획 전체를
 * 새로 만들어 교체하지만, 같은 학습 자료가 새 계획에도 남아 있으면 "학습 완료"/"이해도 점검 완료" 체크는 그대로 이어받는다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudyPlanService {

    private final StudyPlanRepository studyPlanRepository;
    private final LearningResourceRepository learningResourceRepository;
    private final StudyPlanAiService studyPlanAiService;
    private final StudyPlanRetrievalService studyPlanRetrievalService;

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
        List<CollectedCandidate> collected = studyPlanRetrievalService.collectInitial(focusGoal);
        plan.replaceCandidates(toCandidateEntities(plan, collected, Map.of()), now);
        plan.addMessage(
                StudyPlanMessageRole.USER,
                buildCreationSummary(weeklyAvailableMinutes, focusGoal),
                now);
        plan.addMessage(
                StudyPlanMessageRole.ASSISTANT, buildCandidatesFoundSummary(collected), now);
        return StudyPlanResponse.from(studyPlanRepository.save(plan));
    }

    @Transactional
    public StudyPlanResponse sendMessage(Long id, String content) {
        StudyPlan plan = findOrThrow(id);
        LocalDateTime now = LocalDateTime.now();

        if (plan.isCollecting()) {
            int beforeCount = plan.getCandidates().size();
            List<LearningResource> currentResources =
                    plan.getCandidates().stream()
                            .map(StudyPlanCandidate::getLearningResource)
                            .toList();
            Map<Long, Boolean> priorSelection =
                    plan.getCandidates().stream()
                            .collect(
                                    Collectors.toMap(
                                            StudyPlanCandidate::getLearningResourceId,
                                            StudyPlanCandidate::isSelected));
            List<CollectedCandidate> adjusted =
                    studyPlanRetrievalService.adjust(currentResources, content);
            plan.replaceCandidates(toCandidateEntities(plan, adjusted, priorSelection), now);
            plan.addMessage(StudyPlanMessageRole.USER, content, now);
            plan.addMessage(
                    StudyPlanMessageRole.ASSISTANT, buildAdjustSummary(beforeCount, adjusted), now);
            // 새로 추가한 메시지들은 flush 전엔 id가 아직 채번되지 않는다(이 메서드는 이미 영속 상태인
            // plan을 그냥 변경만 할 뿐 save()를 따로 호출하지 않으므로) — 응답 만들기 전에 강제로
            // flush해서 프론트가 각 메시지를 고유 id로 구분할 수 있게 한다.
            studyPlanRepository.flush();
            return StudyPlanResponse.from(plan);
        }
        if (plan.isConfirmed()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "확정된 계획입니다. 잠금 해제 후 다시 시도하세요.");
        }

        Map<Long, CompletionState> snapshot = snapshotCompletion(plan);
        GeneratedPlan generated = studyPlanAiService.regenerate(plan, content);
        applyGeneratedPlan(plan, generated, snapshot, now);
        plan.addMessage(StudyPlanMessageRole.USER, content, now);
        plan.addMessage(StudyPlanMessageRole.ASSISTANT, generated.assistantReply(), now);
        studyPlanRepository.flush();
        return StudyPlanResponse.from(plan);
    }

    /** COLLECTING 단계에서 확정된 후보로 최초 Stage/Item을 만들고 DRAFT로 전환한다. */
    @Transactional
    public StudyPlanResponse generatePlan(Long id) {
        StudyPlan plan = findOrThrow(id);
        if (!plan.isCollecting()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 계획이 생성된 상태입니다.");
        }
        List<LearningResource> selected = plan.getSelectedResources();
        if (selected.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "선택된 학습 자료 후보가 없습니다.");
        }
        LocalDateTime now = LocalDateTime.now();
        GeneratedPlan generated =
                studyPlanAiService.generateInitial(
                        selected, plan.getWeeklyAvailableMinutes(), plan.getFocusGoal());
        applyGeneratedPlan(plan, generated, Map.of(), now);
        plan.markGenerated(now);
        plan.addMessage(StudyPlanMessageRole.USER, "이 자료들로 계획을 생성해주세요.", now);
        plan.addMessage(StudyPlanMessageRole.ASSISTANT, generated.assistantReply(), now);
        studyPlanRepository.flush();
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

    /** 후보 하나의 체크박스를 켜고 끈다 — AI를 거치지 않는, 목록엔 남기되 계획 생성 포함 여부만 바꾸는 조작. */
    @Transactional
    public StudyPlanResponse toggleCandidateSelected(Long planId, Long resourceId) {
        StudyPlan plan = findOrThrow(planId);
        StudyPlanCandidate candidate = findCandidateOrThrow(plan, resourceId);
        candidate.setSelected(!candidate.isSelected());
        return StudyPlanResponse.from(plan);
    }

    /** 카테고리 전체를 한 번에 선택/해제한다. */
    @Transactional
    public StudyPlanResponse setCategorySelected(Long planId, String category, boolean selected) {
        StudyPlan plan = findOrThrow(planId);
        plan.getCandidates().stream()
                .filter(
                        c ->
                                c.getLearningResource().getTaxonomyNodes().stream()
                                        .anyMatch(node -> node.getName().equals(category)))
                .forEach(c -> c.setSelected(selected));
        return StudyPlanResponse.from(plan);
    }

    private StudyPlanCandidate findCandidateOrThrow(StudyPlan plan, Long resourceId) {
        return plan.getCandidates().stream()
                .filter(c -> c.getLearningResourceId().equals(resourceId))
                .findFirst()
                .orElseThrow(EntityNotFoundException::new);
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
        sb.append("에 맞는 학습 자료를 찾아주세요.");
        return sb.toString();
    }

    private List<StudyPlanCandidate> toCandidateEntities(
            StudyPlan plan, List<CollectedCandidate> collected, Map<Long, Boolean> priorSelection) {
        return collected.stream()
                .map(
                        c ->
                                StudyPlanCandidate.create(
                                        plan,
                                        c.resource(),
                                        priorSelection.getOrDefault(c.resource().getId(), true),
                                        c.familiar()))
                .toList();
    }

    private String buildCandidatesFoundSummary(List<CollectedCandidate> candidates) {
        if (candidates.isEmpty()) {
            return "조건에 맞는 학습 자료를 찾지 못했어요. 목표를 조금 더 구체적으로 알려주시겠어요?";
        }
        Map<String, Long> countByCategory =
                candidates.stream()
                        .flatMap(c -> categoryLabels(c.resource()).stream())
                        .collect(
                                Collectors.groupingBy(
                                        name -> name, LinkedHashMap::new, Collectors.counting()));
        String breakdown =
                countByCategory.entrySet().stream()
                        .map(e -> e.getKey() + " " + e.getValue() + "개")
                        .collect(Collectors.joining(", "));
        return "총 "
                + candidates.size()
                + "개 후보를 찾았어요: "
                + breakdown
                + ". 체크박스로 직접 골라도 되고, 마음에 안 드는 게 있으면 말씀해주셔도 돼요 — 괜찮으면 '이 자료들로 계획 생성' 버튼을 눌러주세요.";
    }

    private String buildAdjustSummary(int beforeCount, List<CollectedCandidate> after) {
        return "후보를 조정했어요(이전 "
                + beforeCount
                + "개 -> 현재 "
                + after.size()
                + "개). 더 조정하시겠어요? 괜찮으면 '이 자료들로 계획 생성' 버튼을 눌러주세요.";
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

    private static List<String> categoryLabels(LearningResource resource) {
        if (resource.getTaxonomyNodes().isEmpty()) {
            return List.of("미분류");
        }
        return resource.getTaxonomyNodes().stream().map(node -> node.getName()).toList();
    }
}
