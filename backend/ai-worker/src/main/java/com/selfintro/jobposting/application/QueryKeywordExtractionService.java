package com.selfintro.jobposting.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.AiJsonSupport;
import com.selfintro.global.ai.NvidiaNimClient;
import java.time.Duration;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * 채용공고 텍스트에서 하이브리드 검색의 lexical(키워드 일치) 절반에 쓸 핵심 기술/도메인 키워드를 NVIDIA NIM(무료)으로 뽑아낸다.
 *
 * <p>{@link JobMatchingService}와 같은 패턴 — NVIDIA_API_KEY가 없거나 호출/파싱이 실패하면 빈 리스트로 조용히 넘어간다(하이브리드 점수는
 * vector 유사도만으로 계산됨).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QueryKeywordExtractionService {

    private static final int MAX_OUTPUT_TOKENS = 512;
    private static final Duration TIMEOUT = Duration.ofSeconds(30);

    private static final String EXTRACTION_PROMPT =
            """
            당신은 채용 공고 텍스트에서 지원자 경험 매칭에 쓸 핵심 기술/도메인 키워드를 뽑아내는 보조입니다.
            공고 제목/직무설명/자격요건/우대사항 텍스트가 주어지면, 그 안에서 기술 스택, 도메인 용어, 핵심 역량 키워드를
            최대 10개까지 뽑으세요. 새로운 사실을 추측하지 말고 주어진 텍스트에 실제로 등장하는 표현만 사용하세요.
            생각 과정이나 부연 설명 없이 오직 아래 JSON 구조만 반환하세요.
            {"keywords":[]}
            """;

    private final NvidiaNimClient nvidiaNimClient;
    private final ObjectMapper objectMapper;

    public List<String> extract(String queryText) {
        try {
            KeywordResponse response =
                    AiJsonSupport.generateAndParse(
                            () ->
                                    nvidiaNimClient.generateJsonOnce(
                                            EXTRACTION_PROMPT,
                                            queryText,
                                            MAX_OUTPUT_TOKENS,
                                            TIMEOUT),
                            this::parseKeywordResponse,
                            2);
            return response.keywords() != null ? response.keywords() : List.of();
        } catch (JsonProcessingException exception) {
            log.warn("쿼리 키워드 추출 응답 처리 실패", exception);
            return List.of();
        } catch (ResponseStatusException exception) {
            log.warn("쿼리 키워드 추출 실패: {}", exception.getReason());
            return List.of();
        } catch (RuntimeException exception) {
            log.warn("쿼리 키워드 추출 중 오류", exception);
            return List.of();
        }
    }

    private KeywordResponse parseKeywordResponse(String raw) throws JsonProcessingException {
        return AiJsonSupport.parseJson(objectMapper, raw, KeywordResponse.class, "쿼리 키워드 추출");
    }

    private record KeywordResponse(List<String> keywords) {}
}
