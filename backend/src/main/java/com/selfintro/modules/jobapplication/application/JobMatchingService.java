package com.selfintro.modules.jobapplication.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.skill.domain.repository.SkillRepository;
import java.util.List;
import java.util.Locale;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * 공고와 내 기술 스택 간 적합도를 2단계로 평가한다: 1) 키워드 사전 필터로 AI 호출 여부를 결정하고, 2) 통과한 공고만 NVIDIA NIM으로 최종 점수/근거를
 * 생성한다.
 */
@Slf4j
@Service
public class JobMatchingService {

    private static final String MATCH_PROMPT =
            """
            당신은 채용 공고와 지원자의 보유 기술을 비교해 적합도를 평가하는 채용 매칭 보조입니다.
            입력으로 지원자의 보유 기술 목록과 채용 공고의 제목·요건 텍스트가 주어집니다.
            주어진 정보만 근거로 판단하고 새로운 사실을 추측하지 마세요.
            score는 0~100 사이 정수이고, reason은 그 점수를 준 이유를 한국어 2문장 이내로 작성하세요.
            설명이나 마크다운 없이 반드시 아래 JSON 구조만 반환하세요.
            {"score":0,"reason":""}
            """;

    private final SkillRepository skillRepository;
    private final NvidiaNimClient nvidiaNimClient;
    private final ObjectMapper objectMapper;
    private final int keywordThreshold;
    private final boolean aiScoringEnabled;

    public JobMatchingService(
            SkillRepository skillRepository,
            NvidiaNimClient nvidiaNimClient,
            ObjectMapper objectMapper,
            @Value("${app.job-posting.matching.keyword-threshold:2}") int keywordThreshold,
            @Value("${app.ai.job-posting-matching.enabled:false}") boolean aiScoringEnabled) {
        this.skillRepository = skillRepository;
        this.nvidiaNimClient = nvidiaNimClient;
        this.objectMapper = objectMapper;
        this.keywordThreshold = keywordThreshold;
        this.aiScoringEnabled = aiScoringEnabled;
    }

    public MatchResult evaluate(String title, String requiredSkillsRaw) {
        List<String> mySkillNames = skillRepository.findAll().stream().map(Skill::getName).toList();
        String haystack = (safe(title) + " " + safe(requiredSkillsRaw)).toLowerCase(Locale.ROOT);
        long overlapCount =
                mySkillNames.stream()
                        .filter(name -> haystack.contains(name.toLowerCase(Locale.ROOT)))
                        .count();

        if (overlapCount < keywordThreshold) {
            return MatchResult.empty();
        }
        if (!aiScoringEnabled) {
            return MatchResult.empty();
        }

        try {
            String userPrompt =
                    "보유 기술: "
                            + String.join(", ", mySkillNames)
                            + "\n\n공고 제목: "
                            + safe(title)
                            + "\n공고 요건: "
                            + safe(requiredSkillsRaw);
            String raw = nvidiaNimClient.generate(MATCH_PROMPT, userPrompt);
            ScoreResponse response =
                    AiJsonSupport.parseJson(objectMapper, raw, ScoreResponse.class, "채용 공고 매칭 평가");
            return new MatchResult(
                    clampScore(response.score()), AiJsonSupport.limit(response.reason(), 500));
        } catch (JsonProcessingException exception) {
            log.warn("채용 공고 매칭 평가 응답 처리 실패", exception);
            return MatchResult.empty();
        } catch (RuntimeException exception) {
            log.warn("채용 공고 매칭 평가 중 오류", exception);
            return MatchResult.empty();
        }
    }

    private static Integer clampScore(Integer score) {
        if (score == null) return null;
        return Math.max(0, Math.min(100, score));
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }

    public record MatchResult(Integer score, String reason) {
        static MatchResult empty() {
            return new MatchResult(null, null);
        }
    }

    private record ScoreResponse(Integer score, String reason) {}
}
