package com.selfintro.global.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;
import java.util.stream.Collector;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class AiJsonSupport {
    private static final Logger log = LoggerFactory.getLogger(AiJsonSupport.class);
    private static final int RAW_LOG_LIMIT = 1000;

    private AiJsonSupport() {}

    public static <T> T parseJson(
            ObjectMapper objectMapper, String raw, Class<T> type, String stage)
            throws JsonProcessingException {
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        if (start < 0 || end <= start) {
            log.warn(
                    "{} 단계 AI 원본 응답에서 JSON을 찾지 못함 (length={}): {}",
                    stage,
                    raw.length(),
                    raw.length() > RAW_LOG_LIMIT
                            ? raw.substring(0, RAW_LOG_LIMIT) + "...(생략)"
                            : raw);
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, stage + " 단계에서 AI가 올바른 JSON을 반환하지 않았습니다.");
        }
        // 트리로 먼저 파싱해 중복 키(예: 비전 모델이 "location"을 두 번 반환)를 병합한 뒤 바인딩한다.
        // record는 세터가 없어, 문자열을 바로 readValue하면 중복 키의 두 번째 값 설정 시
        // "No fallback setter/field defined for creator property" 예외가 난다.
        JsonNode tree = objectMapper.readTree(raw.substring(start, end + 1));
        return objectMapper.treeToValue(tree, type);
    }

    @FunctionalInterface
    public interface JsonParser<T> {
        T parse(String raw) throws JsonProcessingException;
    }

    /**
     * reasoning 모델이 최종 JSON 대신 사고 과정 텍스트만 답으로 내놓는 경우가 있고, 이는 온도(0.2)에 따른 응답 변동으로 재시도하면 통과하기도 한다. AI
     * 호출 + JSON 파싱을 조합에서 실패 시 한 번 재시도하는 공통 로직 — 각 서비스가 재시도 루프를 따로 짜지 않도록 여기서 한 번만 구현한다. parser는 파싱
     * 실패 시 {@link ResponseStatusException}이나 {@link JsonProcessingException}을 던져야 재시도 대상으로 인식된다(예:
     * {@link #parseJson}, 혹은 서비스별 커스텀 폴백을 감싼 메서드).
     */
    public static <T> T generateAndParse(
            Supplier<String> rawSupplier, JsonParser<T> parser, int maxAttempts)
            throws JsonProcessingException {
        ResponseStatusException lastJsonError =
                new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI 응답 처리에 실패했습니다.");
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            String raw = rawSupplier.get();
            try {
                return parser.parse(raw);
            } catch (ResponseStatusException exception) {
                lastJsonError = exception;
            }
        }
        throw lastJsonError;
    }

    public static <T> List<T> select(
            List<T> all, List<Long> requestedIds, Function<T, Long> idExtractor, String label) {
        if (requestedIds.isEmpty()) return all;
        Set<Long> requested = new LinkedHashSet<>(requestedIds);
        List<T> selected =
                all.stream().filter(item -> requested.contains(idExtractor.apply(item))).toList();
        if (selected.size() != requested.size()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "존재하지 않는 " + label + " 항목이 포함되어 있습니다.");
        }
        return selected;
    }

    public static <T> Set<Long> toIdSet(List<T> items, Function<T, Long> idExtractor) {
        return items.stream().map(idExtractor).collect(toLinkedSet());
    }

    public static <T, K> Predicate<T> distinctBy(Function<T, K> keyExtractor) {
        Set<K> seen = new LinkedHashSet<>();
        return value -> seen.add(keyExtractor.apply(value));
    }

    public static <T> Collector<T, ?, Set<T>> toLinkedSet() {
        return Collectors.toCollection(LinkedHashSet::new);
    }

    public static <T> List<T> safe(List<T> values) {
        return values == null ? List.of() : values;
    }

    public static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    public static String blankToNull(String value) {
        return hasText(value) ? value.trim() : null;
    }

    public static String limit(String value, int max) {
        if (value == null) return "";
        String trimmed = value.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
    }

    /** AI 응답 JsonNode에서 필드 하나를 안전하게 꺼낸다 — 값이 없거나 공백이면 fallback을 쓴다. */
    public static String text(JsonNode node, String field, String fallback, int maxLength) {
        JsonNode value = node.path(field);
        if (!value.isValueNode()) return fallback;
        String result = value.asText().trim();
        if (result.isBlank()) return fallback;
        return result.length() > maxLength ? result.substring(0, maxLength) : result;
    }

    public static String writeJson(ObjectMapper objectMapper, Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("AI 초안 JSON 직렬화에 실패했습니다.", exception);
        }
    }
}
