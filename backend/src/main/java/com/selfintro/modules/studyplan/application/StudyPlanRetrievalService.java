package com.selfintro.modules.studyplan.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.modules.learningresource.application.LearningResourceService;
import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.repository.LearningResourceRepository;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourceResponse;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * 채팅으로 학습 목표를 좁혀서 계획 생성에 쓸 소수의 학습 자료 후보를 모은다. 검색 자체는 기존 {@link
 * LearningResourceService#searchAdmin}(제목/요약/본문/태그 키워드 검색, 이미 구현돼 있음)을 그대로 재사용하고, AI는 "어떤 키워드로
 * 검색할지"와 "피드백을 반영해 뭘 빼고 더할지"만 짧게 판단한다 — 응답이 작아서 {@link StudyPlanAiService}에서 겪은 토큰/타임아웃 문제와 무관하다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StudyPlanRetrievalService {

    private static final int DEFAULT_LIMIT = 40;

    private static final String INTENT_PROMPT =
            """
            detailed thinking off
            사용자의 학습 목표 텍스트에서, 관련 학습 자료를 찾기 위한 한국어 검색 키워드를 3~6개
            뽑으세요. 목표 문장을 그대로 반복하지 말고, 실제 자료 제목·요약에 등장할 법한 구체적인
            기술/주제 단어로 뽑으세요(예: "백엔드 심화" -> "스프링", "동시성", "데이터베이스").
            설명 없이 반드시 아래 JSON만 반환하세요.
            {"keywords":["",""]}
            """;

    private static final String ADJUST_PROMPT =
            """
            detailed thinking off
            지금까지 모은 학습 자료 후보 목록(id/제목/카테고리)과 사용자의 피드백이 주어집니다.
            피드백을 반영해 후보에서 뺄 자료의 id 목록과, 추가로 검색해볼 키워드를 판단하세요.
            목록에 없는 id를 만들어내지 마세요. 뺄 게 없으면 빈 배열, 추가 검색이 필요 없으면
            빈 배열을 반환하세요. 설명 없이 반드시 아래 JSON만 반환하세요.
            {"removeResourceIds":[],"additionalKeywords":[]}
            """;

    private final LearningResourceService learningResourceService;
    private final LearningResourceRepository learningResourceRepository;
    private final NvidiaNimClient nvidiaNimClient;
    private final ObjectMapper objectMapper;

    /** 최초 생성 폼의 목표 텍스트로부터 후보를 모은다. 목표가 비어 있거나 검색 결과가 없으면 우선순위 높은 자료로 대체한다. */
    public List<LearningResource> collectInitial(String focusGoal) {
        List<String> keywords = extractKeywords(focusGoal);
        List<LearningResource> found = searchByKeywords(keywords, DEFAULT_LIMIT);
        return found.isEmpty() ? fallbackByPriority(DEFAULT_LIMIT) : found;
    }

    /** 대화형 피드백을 반영해 현재 후보 목록을 add/remove로 조정한다. */
    public List<LearningResource> adjust(List<LearningResource> current, String feedback) {
        Map<Long, LearningResource> byId = new LinkedHashMap<>();
        current.forEach(r -> byId.put(r.getId(), r));

        String raw = nvidiaNimClient.generate(ADJUST_PROMPT, buildAdjustPrompt(current, feedback));
        AdjustResponse response;
        try {
            response =
                    AiJsonSupport.parseJson(objectMapper, raw, AdjustResponse.class, "학습 자료 후보 조정");
        } catch (JsonProcessingException exception) {
            log.warn("StudyPlan 후보 조정 응답 파싱 실패, 원문: {}", AiJsonSupport.limit(raw, 2000), exception);
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "AI가 후보 조정 응답을 올바른 형식으로 반환하지 않았습니다.", exception);
        }

        for (Long removeId : AiJsonSupport.safe(response.removeResourceIds())) {
            byId.remove(removeId);
        }
        for (LearningResource added :
                searchByKeywords(
                        AiJsonSupport.safe(response.additionalKeywords()), DEFAULT_LIMIT)) {
            byId.putIfAbsent(added.getId(), added);
        }
        return new ArrayList<>(byId.values());
    }

    private List<String> extractKeywords(String focusGoal) {
        if (!AiJsonSupport.hasText(focusGoal)) return List.of();
        String raw = nvidiaNimClient.generate(INTENT_PROMPT, "목표: " + focusGoal);
        try {
            KeywordResponse response =
                    AiJsonSupport.parseJson(
                            objectMapper, raw, KeywordResponse.class, "학습 자료 검색어 추출");
            return AiJsonSupport.safe(response.keywords());
        } catch (JsonProcessingException exception) {
            log.warn(
                    "StudyPlan 검색어 추출 응답 파싱 실패, 원문: {}", AiJsonSupport.limit(raw, 2000), exception);
            return List.of();
        }
    }

    private List<LearningResource> searchByKeywords(List<String> keywords, int limit) {
        Map<Long, LearningResource> byId = new LinkedHashMap<>();
        for (String keyword : keywords) {
            if (byId.size() >= limit) break;
            if (!AiJsonSupport.hasText(keyword)) continue;
            List<Long> ids =
                    learningResourceService
                            .searchAdmin(keyword, null, null, null, null, null, null, 0, limit)
                            .content()
                            .stream()
                            .map(LearningResourceResponse::id)
                            .toList();
            if (ids.isEmpty()) continue;
            for (LearningResource resource : learningResourceRepository.findAllById(ids)) {
                byId.putIfAbsent(resource.getId(), resource);
            }
        }
        return byId.values().stream().limit(limit).toList();
    }

    private List<LearningResource> fallbackByPriority(int limit) {
        List<Long> ids =
                learningResourceService
                        .searchAdmin(
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                LearningResourcePriorityTier.P0,
                                0,
                                limit)
                        .content()
                        .stream()
                        .map(LearningResourceResponse::id)
                        .toList();
        return ids.isEmpty() ? List.of() : learningResourceRepository.findAllById(ids);
    }

    private String buildAdjustPrompt(List<LearningResource> current, String feedback) {
        StringBuilder sb = new StringBuilder();
        sb.append("## 현재 후보\n");
        current.forEach(
                r ->
                        sb.append("- id=")
                                .append(r.getId())
                                .append(" 제목=")
                                .append(r.getTitle())
                                .append(" 카테고리=")
                                .append(r.getCategory().getName())
                                .append("\n"));
        sb.append("\n## 사용자 피드백\n").append(feedback).append("\n");
        return sb.toString();
    }

    private record KeywordResponse(List<String> keywords) {}

    private record AdjustResponse(List<Long> removeResourceIds, List<String> additionalKeywords) {}
}
