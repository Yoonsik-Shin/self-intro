package com.selfintro.modules.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collector;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class AiJsonSupport {
    private AiJsonSupport() {}

    public static <T> T parseJson(ObjectMapper objectMapper, String raw, Class<T> type, String stage)
        throws JsonProcessingException {
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        if (start < 0 || end <= start) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                stage + " 단계에서 AI가 올바른 JSON을 반환하지 않았습니다.");
        }
        return objectMapper.readValue(raw.substring(start, end + 1), type);
    }

    public static <T> List<T> select(
        List<T> all,
        List<Long> requestedIds,
        Function<T, Long> idExtractor,
        String label
    ) {
        if (requestedIds.isEmpty()) return all;
        Set<Long> requested = new LinkedHashSet<>(requestedIds);
        List<T> selected = all.stream().filter(item -> requested.contains(idExtractor.apply(item))).toList();
        if (selected.size() != requested.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "존재하지 않는 " + label + " 항목이 포함되어 있습니다.");
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
}
