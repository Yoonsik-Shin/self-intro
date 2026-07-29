package com.selfintro.modules.studyplan.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.global.ai.CareerProfileDigestBuilder;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import com.selfintro.modules.learningresource.domain.entity.LearningResourceRelation;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceRelationType;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import com.selfintro.modules.learningresource.domain.repository.LearningResourceRepository;
import com.selfintro.modules.studyplan.domain.entity.StudyPlan;
import com.selfintro.modules.studyplan.domain.entity.StudyPlanItem;
import com.selfintro.modules.studyplan.domain.entity.StudyPlanMessage;
import com.selfintro.modules.studyplan.domain.entity.StudyPlanStage;
import com.selfintro.modules.studyplan.domain.enums.StudyPlanMessageRole;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * 학습 자료 후보를 선후관계(PREREQUISITE) 제약과 함께 AI에게 넘겨, 의미 있는 테마 Stage로 묶은 계획을 생성/재생성한다.
 *
 * <p>선후관계는 AI가 스스로 추론하지 않도록 이 클래스가 미리 계산해 제약으로 준다. AI는 그 제약 안에서 카테고리·자료 성격을 근거로 테마를 나누고 시간 배분을 정할
 * 뿐이고, 실제로 순서를 지켰는지는 파싱 후 이 클래스가 다시 검증해 위반이 있으면 결정적으로 자동 보정한다 — 순서 무결성은 AI가 아니라 코드가 보장한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StudyPlanAiService {

    private static final int MAX_RECENT_MESSAGES = 6;

    private static final String SYSTEM_PROMPT =
            """
            당신은 개인 학습 계획을 짜주는 코치입니다. 아래 규칙을 반드시 지키세요.
            1. 입력으로 주어진 학습 자료 후보의 id만 사용하세요. 새 자료를 지어내지 마세요.
            2. 카테고리와 자료 성격(기초/응용/신기술 등)을 근거로 3~6개 정도의 의미 있는 테마로
               묶으세요. 예: "기본기 다지기", "실전/응용", "신기술 학습".
            3. 입력으로 주어지는 "선행 제약"(A는 반드시 B보다 앞 Stage)은 절대 어기지 마세요.
            4. 같은 Stage 안 자료들은 서로 병렬로 진행해도 된다는 뜻이니, 그 안에는 선후관계가 없는
               자료끼리만 묶으세요.
            5. 각 Stage의 총 배분 시간이 사용자의 주당 가용 시간 기준으로 너무 크지 않게 나누세요.
            6. learningResourceId가 있는 각 항목마다 이해도를 스스로 점검할 수 있는 자유서술형
               질문을 3~5개 만드세요. 채점용 정답이 아니라 "이런 내용이 들어가면 좋다" 정도의 짧은
               모범답안 힌트도 함께 주세요. learningResourceId가 없는(자유 항목) 경우
               checkQuestions는 빈 배열로 두세요.
            7. 설명이나 마크다운 없이 반드시 아래 JSON 구조만 반환하세요.
            {"assistantReply":"","stages":[{"stageOrder":1,"theme":"","items":[{"learningResourceId":1,"freeTextLabel":null,"allocatedMinutes":60,"notes":"","checkQuestions":[{"question":"","modelAnswerHint":""}]}]}]}
            """;

    private final LearningResourceRepository learningResourceRepository;
    private final CareerProfileDigestBuilder careerProfileDigestBuilder;
    private final NvidiaNimClient nvidiaNimClient;
    private final ObjectMapper objectMapper;

    public GeneratedPlan generateInitial(int weeklyAvailableMinutes, String focusGoal) {
        CandidateSet candidates = loadCandidates();
        String userPrompt = buildInitialUserPrompt(candidates, weeklyAvailableMinutes, focusGoal);
        return callAndValidate(userPrompt, candidates);
    }

    public GeneratedPlan regenerate(StudyPlan plan, String feedbackContent) {
        CandidateSet candidates = loadCandidates();
        String userPrompt = buildRegenerateUserPrompt(candidates, plan, feedbackContent);
        return callAndValidate(userPrompt, candidates);
    }

    private GeneratedPlan callAndValidate(String userPrompt, CandidateSet candidates) {
        String raw = nvidiaNimClient.generate(SYSTEM_PROMPT, userPrompt);
        StudyPlanAiResponse response;
        try {
            response =
                    AiJsonSupport.parseJson(
                            objectMapper, raw, StudyPlanAiResponse.class, "학습 계획 생성");
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "AI가 학습 계획 응답을 올바른 형식으로 반환하지 않았습니다.", exception);
        }
        return validateAndCorrect(response, candidates);
    }

    // ---------------------------------------------------------------------
    // 후보 추출 + 선후관계 제약 계산
    // ---------------------------------------------------------------------

    private CandidateSet loadCandidates() {
        List<LearningResource> all = learningResourceRepository.findAll();
        Map<Long, LearningResource> byId = new LinkedHashMap<>();
        for (LearningResource resource : all) {
            if (resource.getStatus() == LearningResourceStatus.COMPLETED) continue;
            if (resource.getDurationMinutes() == null) continue;
            byId.put(resource.getId(), resource);
        }

        List<PrerequisitePair> pairs = new ArrayList<>();
        for (LearningResource resource : all) {
            for (LearningResourceRelation relation : resource.getRelations()) {
                if (relation.getType() != LearningResourceRelationType.PREREQUISITE) continue;
                Long sourceId = relation.getSource().getId();
                Long targetId = relation.getTarget().getId();
                if (byId.containsKey(sourceId) && byId.containsKey(targetId)) {
                    pairs.add(new PrerequisitePair(sourceId, targetId));
                }
            }
        }

        Map<Long, Integer> depth = computeDepth(byId.keySet(), pairs);
        return new CandidateSet(byId, pairs, depth);
    }

    /** 참고용 깊이(depth) — AI에게 "대략 몇 단계쯤 뒤에 와야 하는지" 감을 주는 힌트일 뿐, Stage 경계를 강제하지 않는다. */
    private Map<Long, Integer> computeDepth(Set<Long> candidateIds, List<PrerequisitePair> pairs) {
        Map<Long, List<Long>> outEdges = new HashMap<>();
        Map<Long, Integer> inDegree = new HashMap<>();
        for (Long id : candidateIds) inDegree.put(id, 0);
        for (PrerequisitePair pair : pairs) {
            outEdges.computeIfAbsent(pair.beforeId(), k -> new ArrayList<>()).add(pair.afterId());
            inDegree.merge(pair.afterId(), 1, Integer::sum);
        }

        Map<Long, Integer> depth = new HashMap<>();
        ArrayDeque<Long> queue = new ArrayDeque<>();
        for (Long id : candidateIds) {
            if (inDegree.get(id) == 0) {
                depth.put(id, 0);
                queue.add(id);
            }
        }
        Map<Long, Integer> remainingInDegree = new HashMap<>(inDegree);
        while (!queue.isEmpty()) {
            Long current = queue.poll();
            for (Long next : outEdges.getOrDefault(current, List.of())) {
                depth.merge(next, depth.get(current) + 1, Math::max);
                int remaining = remainingInDegree.merge(next, -1, Integer::sum);
                if (remaining == 0) queue.add(next);
            }
        }
        // 사이클 등으로 처리되지 못한 노드는 방어적으로 가장 깊은 값 뒤에 붙인다.
        int fallbackDepth = depth.values().stream().mapToInt(Integer::intValue).max().orElse(0) + 1;
        for (Long id : candidateIds) {
            if (!depth.containsKey(id)) {
                log.warn("StudyPlan 선후관계 그래프에 사이클 의심 노드 발견, 방어적으로 배치: resourceId={}", id);
                depth.put(id, fallbackDepth);
            }
        }
        return depth;
    }

    // ---------------------------------------------------------------------
    // 프롬프트 구성
    // ---------------------------------------------------------------------

    private String buildInitialUserPrompt(
            CandidateSet candidates, int weeklyAvailableMinutes, String focusGoal) {
        StringBuilder sb = new StringBuilder();
        appendProfile(sb);
        appendCandidates(sb, candidates);
        appendPrerequisites(sb, candidates);
        appendUserInput(sb, weeklyAvailableMinutes, focusGoal);
        return sb.toString();
    }

    private String buildRegenerateUserPrompt(
            CandidateSet candidates, StudyPlan plan, String feedbackContent) {
        StringBuilder sb = new StringBuilder();
        appendProfile(sb);
        appendCandidates(sb, candidates);
        appendPrerequisites(sb, candidates);
        appendUserInput(sb, plan.getWeeklyAvailableMinutes(), plan.getFocusGoal());
        appendCurrentPlan(sb, plan);
        appendRecentMessages(sb, plan);
        sb.append("## 새 피드백\n").append(feedbackContent).append("\n\n");
        sb.append(
                "이전 계획과 위 피드백이 주어졌습니다. 요청을 최소한으로 반영해 계획을 다시 구성하되, "
                        + "completed:true로 표시된 항목은 사용자가 명시적으로 요청하지 않는 한 다른 Stage로 옮기거나 빼지 마세요.\n");
        return sb.toString();
    }

    private void appendProfile(StringBuilder sb) {
        sb.append("## 지원자 프로필\n").append(careerProfileDigestBuilder.build()).append("\n\n");
    }

    private void appendCandidates(StringBuilder sb, CandidateSet candidates) {
        sb.append("## 학습 자료 후보\n");
        candidates.byId().values().stream()
                .sorted(
                        Comparator.comparing(
                                        (LearningResource r) -> candidates.depth().get(r.getId()))
                                .thenComparing(
                                        r ->
                                                r.getPriorityTier() == null
                                                        ? 99
                                                        : r.getPriorityTier().ordinal())
                                .thenComparing(LearningResource::getId))
                .forEach(
                        r ->
                                sb.append("- id=")
                                        .append(r.getId())
                                        .append(" 제목=")
                                        .append(r.getTitle())
                                        .append(" 카테고리=")
                                        .append(r.getCategory().getName())
                                        .append(" 유형=")
                                        .append(r.getResourceType())
                                        .append(" 우선순위=")
                                        .append(r.getPriorityTier())
                                        .append(" 소요시간=")
                                        .append(r.getDurationMinutes())
                                        .append("분 참고깊이=")
                                        .append(candidates.depth().get(r.getId()))
                                        .append("\n"));
        sb.append("\n");
    }

    private void appendPrerequisites(StringBuilder sb, CandidateSet candidates) {
        sb.append("## 선행 제약 (A는 반드시 B보다 앞 Stage)\n");
        if (candidates.prerequisitePairs().isEmpty()) {
            sb.append("(없음)\n\n");
            return;
        }
        for (PrerequisitePair pair : candidates.prerequisitePairs()) {
            sb.append("- ")
                    .append(pair.beforeId())
                    .append(" -> ")
                    .append(pair.afterId())
                    .append("\n");
        }
        sb.append("\n");
    }

    private void appendUserInput(StringBuilder sb, int weeklyAvailableMinutes, String focusGoal) {
        sb.append("## 사용자 입력\n");
        sb.append("주당 가용 시간(분): ").append(weeklyAvailableMinutes).append("\n");
        if (AiJsonSupport.hasText(focusGoal)) {
            sb.append("목표/집중 방향: ").append(focusGoal).append("\n");
        }
        sb.append("\n");
    }

    private void appendCurrentPlan(StringBuilder sb, StudyPlan plan) {
        sb.append("## 현재 계획\n");
        for (StudyPlanStage stage : plan.getStages()) {
            sb.append("Stage ")
                    .append(stage.getStageOrder())
                    .append(": ")
                    .append(stage.getTheme())
                    .append("\n");
            for (StudyPlanItem item : stage.getItems()) {
                sb.append("  - ");
                if (item.getLearningResourceId() != null) {
                    sb.append("id=").append(item.getLearningResourceId());
                } else {
                    sb.append("자유항목=").append(item.getFreeTextLabel());
                }
                sb.append(" completed=")
                        .append(item.isCompleted())
                        .append(" 배분시간=")
                        .append(item.getAllocatedMinutes())
                        .append("분\n");
            }
        }
        sb.append("\n");
    }

    private void appendRecentMessages(StringBuilder sb, StudyPlan plan) {
        List<StudyPlanMessage> messages = plan.getMessages();
        int from = Math.max(0, messages.size() - MAX_RECENT_MESSAGES);
        sb.append("## 대화 이력\n");
        for (StudyPlanMessage message : messages.subList(from, messages.size())) {
            String speaker = message.getRole() == StudyPlanMessageRole.USER ? "사용자" : "AI";
            sb.append(speaker).append(": ").append(message.getContent()).append("\n");
        }
        sb.append("\n");
    }

    // ---------------------------------------------------------------------
    // 검증 + 선후관계 위반 자동 보정
    // ---------------------------------------------------------------------

    private GeneratedPlan validateAndCorrect(
            StudyPlanAiResponse response, CandidateSet candidates) {
        record FlatItem(
                String originalTheme,
                Long learningResourceId,
                String freeTextLabel,
                int allocatedMinutes,
                String notes,
                List<GeneratedCheckQuestion> checkQuestions,
                int[] stageOrder) {}

        List<FlatItem> flat = new ArrayList<>();
        for (StageAi stage : response.stages()) {
            for (ItemAi item : stage.items()) {
                if (item.allocatedMinutes() == null || item.allocatedMinutes() <= 0) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_GATEWAY, "AI가 잘못된 배분 시간을 반환했습니다.");
                }
                if (item.learningResourceId() != null
                        && !candidates.byId().containsKey(item.learningResourceId())) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_GATEWAY, "AI가 존재하지 않는 학습 자료 id를 반환했습니다.");
                }
                List<GeneratedCheckQuestion> questions =
                        item.learningResourceId() == null
                                ? List.of()
                                : AiJsonSupport.safe(item.checkQuestions()).stream()
                                        .map(
                                                q ->
                                                        new GeneratedCheckQuestion(
                                                                q.question(), q.modelAnswerHint()))
                                        .toList();
                flat.add(
                        new FlatItem(
                                stage.theme(),
                                item.learningResourceId(),
                                item.freeTextLabel(),
                                item.allocatedMinutes(),
                                item.notes(),
                                questions,
                                new int[] {stage.stageOrder() == null ? 1 : stage.stageOrder()}));
            }
        }

        Map<Long, int[]> stageOrderByResourceId = new HashMap<>();
        for (FlatItem item : flat) {
            if (item.learningResourceId() != null) {
                stageOrderByResourceId.put(item.learningResourceId(), item.stageOrder());
            }
        }

        boolean changed = true;
        int guard = 0;
        int safetyCap = candidates.byId().size() + flat.size() + 10;
        while (changed && guard++ < safetyCap) {
            changed = false;
            for (PrerequisitePair pair : candidates.prerequisitePairs()) {
                int[] beforeOrder = stageOrderByResourceId.get(pair.beforeId());
                int[] afterOrder = stageOrderByResourceId.get(pair.afterId());
                if (beforeOrder == null || afterOrder == null) continue;
                if (afterOrder[0] <= beforeOrder[0]) {
                    afterOrder[0] = beforeOrder[0] + 1;
                    changed = true;
                }
            }
        }
        if (guard >= safetyCap) {
            log.warn("StudyPlan 선후관계 자동 보정이 안정화되지 않아 안전 한도에서 중단했습니다.");
        }

        Map<Integer, Integer> bucketFinalOrder = new LinkedHashMap<>();
        List<Integer> distinctOrders =
                flat.stream().map(item -> item.stageOrder()[0]).distinct().sorted().toList();
        for (int i = 0; i < distinctOrders.size(); i++) {
            bucketFinalOrder.put(distinctOrders.get(i), i + 1);
        }

        Map<Integer, String> themeByBucket = new LinkedHashMap<>();
        Map<Integer, List<GeneratedItem>> itemsByBucket = new LinkedHashMap<>();
        for (FlatItem item : flat) {
            int finalOrder = bucketFinalOrder.get(item.stageOrder()[0]);
            themeByBucket.putIfAbsent(finalOrder, item.originalTheme());
            itemsByBucket
                    .computeIfAbsent(finalOrder, k -> new ArrayList<>())
                    .add(
                            new GeneratedItem(
                                    item.learningResourceId(),
                                    item.freeTextLabel(),
                                    item.allocatedMinutes(),
                                    item.notes(),
                                    item.checkQuestions()));
        }

        List<GeneratedStage> stages =
                itemsByBucket.keySet().stream()
                        .sorted()
                        .map(
                                order ->
                                        new GeneratedStage(
                                                order,
                                                themeByBucket.get(order),
                                                itemsByBucket.get(order)))
                        .toList();

        return new GeneratedPlan(response.assistantReply(), stages);
    }

    // ---------------------------------------------------------------------
    // 데이터 구조
    // ---------------------------------------------------------------------

    private record CandidateSet(
            Map<Long, LearningResource> byId,
            List<PrerequisitePair> prerequisitePairs,
            Map<Long, Integer> depth) {}

    private record PrerequisitePair(Long beforeId, Long afterId) {}

    private record StudyPlanAiResponse(String assistantReply, List<StageAi> stages) {}

    private record StageAi(Integer stageOrder, String theme, List<ItemAi> items) {}

    private record ItemAi(
            Long learningResourceId,
            String freeTextLabel,
            Integer allocatedMinutes,
            String notes,
            List<CheckQuestionAi> checkQuestions) {}

    private record CheckQuestionAi(String question, String modelAnswerHint) {}

    public record GeneratedPlan(String assistantReply, List<GeneratedStage> stages) {}

    public record GeneratedStage(int stageOrder, String theme, List<GeneratedItem> items) {}

    public record GeneratedItem(
            Long learningResourceId,
            String freeTextLabel,
            int allocatedMinutes,
            String notes,
            List<GeneratedCheckQuestion> checkQuestions) {}

    public record GeneratedCheckQuestion(String question, String modelAnswerHint) {}
}
