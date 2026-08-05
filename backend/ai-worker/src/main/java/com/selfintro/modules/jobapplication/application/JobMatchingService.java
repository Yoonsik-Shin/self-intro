package com.selfintro.modules.jobapplication.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.modules.jobposting.domain.repository.JobPostingSettingRepository;
import com.selfintro.modules.skill.domain.repository.SkillRepository;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * 공고와 내 기술 스택 간 적합도를 2단계로 평가한다: 1) 키워드 사전 필터로 AI 호출 여부를 결정하고, 2) 통과한 공고만 NVIDIA NIM으로 최종 점수/근거를
 * 생성한다.
 *
 * <p>키워드 임계치는 재배포 없이 바꾸고 싶은 값이라 {@link JobPostingSettingRepository}(DB, 어드민 설정 화면)에서 매 평가마다 읽는다.
 * 별도의 on/off 플래그 없이 NVIDIA_API_KEY가 설정되어 있으면 바로 동작하며, 키가 없거나 호출이 실패하면 {@link MatchResult#empty()}로
 * 조용히 넘어간다.
 */
@Slf4j
@Service
public class JobMatchingService {

    private static final int MATCH_MAX_OUTPUT_TOKENS = 2048;
    private static final Duration MATCH_AI_TIMEOUT = Duration.ofSeconds(60);
    private static final Pattern SCORE_PATTERN =
            Pattern.compile("(?i)(?:\\\"?score\\\"?|점수)\\s*[:：=]\\s*[\\\"]?(\\d{1,3})[\\\"]?");
    private static final Pattern REASON_PATTERN =
            Pattern.compile("(?is)(?:\\\"?reason\\\"?|이유)\\s*[:：=]\\s*[\\\"]?(.+?)[\\\"]?\\s*$");

    private static final String MATCH_PROMPT =
            """
            당신은 채용 공고와 지원자의 보유 기술을 비교해 적합도를 평가하는 채용 매칭 보조입니다.
            입력으로 지원자의 보유 기술 목록과 채용 공고의 제목·요건 텍스트가 주어집니다.
            주어진 정보만 근거로 판단하고 새로운 사실을 추측하지 마세요.
            score는 0~100 사이 정수이고, reason은 그 점수를 준 이유를 한국어 2문장 이내로 작성하세요.
            생각 과정(thinking)이나 부연 설명 없이 오직 아래 JSON 구조만 반환하세요.
            {"score":0,"reason":""}
            """;

    private final SkillRepository skillRepository;
    private final JobPostingSettingRepository settingRepository;
    private final NvidiaNimClient nvidiaNimClient;
    private final ObjectMapper objectMapper;

    public JobMatchingService(
            SkillRepository skillRepository,
            JobPostingSettingRepository settingRepository,
            NvidiaNimClient nvidiaNimClient,
            ObjectMapper objectMapper) {
        this.skillRepository = skillRepository;
        this.settingRepository = settingRepository;
        this.nvidiaNimClient = nvidiaNimClient;
        this.objectMapper = objectMapper;
    }

    public MatchResult evaluate(String title, String requiredSkillsRaw) {
        List<String> mySkillNames = skillRepository.findAllSkillNames();
        int keywordThreshold = settingRepository.getOrCreateDefault().getMatchingKeywordThreshold();
        return evaluate(title, requiredSkillsRaw, mySkillNames, keywordThreshold);
    }

    public MatchResult evaluate(
            String title,
            String requiredSkillsRaw,
            List<String> mySkillNames,
            int keywordThreshold) {
        String haystack = (safe(title) + " " + safe(requiredSkillsRaw)).toLowerCase(Locale.ROOT);
        long overlapCount =
                mySkillNames.stream()
                        .filter(name -> haystack.contains(name.toLowerCase(Locale.ROOT)))
                        .count();

        if (keywordThreshold > 0 && overlapCount < keywordThreshold) {
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
            ScoreResponse response =
                    AiJsonSupport.generateAndParse(
                            () ->
                                    nvidiaNimClient.generateJsonOnce(
                                            MATCH_PROMPT,
                                            userPrompt,
                                            MATCH_MAX_OUTPUT_TOKENS,
                                            MATCH_AI_TIMEOUT),
                            this::parseScoreResponse,
                            2);
            String reason =
                    AiJsonSupport.hasText(response.reason())
                            ? AiJsonSupport.limit(response.reason(), 500)
                            : "보유 기술 중 " + overlapCount + "개가 공고 제목 또는 요건과 일치한 결과를 바탕으로 산정했습니다.";
            return new MatchResult(clampScore(response.score()), reason);
        } catch (JsonProcessingException exception) {
            log.warn("채용 공고 매칭 평가 응답 처리 실패", exception);
            return MatchResult.empty();
        } catch (ResponseStatusException exception) {
            log.warn("채용 공고 매칭 평가 실패: {}", exception.getReason());
            return MatchResult.empty();
        } catch (RuntimeException exception) {
            log.warn("채용 공고 매칭 평가 중 오류", exception);
            return MatchResult.empty();
        }
    }

    private ScoreResponse parseScoreResponse(String raw) throws JsonProcessingException {
        try {
            return AiJsonSupport.parseJson(objectMapper, raw, ScoreResponse.class, "채용 공고 매칭 평가");
        } catch (ResponseStatusException exception) {
            // 일부 OpenAI 호환 모델은 JSON mode에서도 드물게 `score: 80\nreason: ...`처럼
            // 객체 괄호를 생략한다. 단순한 두 필드 응답만 제한적으로 복구하고, 임의 숫자는 점수로
            // 오인하지 않는다.
            Matcher scoreMatcher = SCORE_PATTERN.matcher(raw);
            if (!scoreMatcher.find()) {
                throw exception;
            }
            Matcher reasonMatcher = REASON_PATTERN.matcher(raw);
            String reason = reasonMatcher.find() ? reasonMatcher.group(1).trim() : null;
            return new ScoreResponse(Integer.valueOf(scoreMatcher.group(1)), reason);
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
