package com.selfintro.modules.jobposting.domain.util;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * 회사명/직무명을 정규화해 서로 다른 플랫폼(원티드/잡코리아/사람인 등)에 올라온 같은 공고를 완전일치로 매칭할 수 있게 한다. 직무명은 공백/대소문자 차이만
 * 흡수하고 키워드는 건드리지 않는다 — 다른 직무를 같은 공고로 오탐 병합하는 것을 막기 위해서다.
 */
public final class JobPostingNormalizer {

    private static final List<Pattern> COMPANY_SUFFIX_PATTERNS =
            List.of(
                    Pattern.compile("^\\(주\\)\\s*|\\s*\\(주\\)$"),
                    Pattern.compile("^㈜\\s*|\\s*㈜$"),
                    Pattern.compile("^주식회사\\s*|\\s*주식회사$"),
                    Pattern.compile("^\\(유\\)\\s*|\\s*\\(유\\)$"),
                    Pattern.compile("^유한회사\\s*|\\s*유한회사$"),
                    Pattern.compile("(?i)\\s*,?\\s*co\\.,?\\s*ltd\\.?$"),
                    Pattern.compile("(?i)\\s*,?\\s*inc\\.?$"),
                    Pattern.compile("(?i)\\s*,?\\s*llc\\.?$"));

    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private JobPostingNormalizer() {}

    public static String normalizeCompanyName(String raw) {
        if (raw == null) {
            return "";
        }
        String normalized = WHITESPACE.matcher(raw.trim()).replaceAll(" ");
        for (Pattern pattern : COMPANY_SUFFIX_PATTERNS) {
            normalized = pattern.matcher(normalized).replaceAll("").trim();
        }
        normalized = WHITESPACE.matcher(normalized).replaceAll(" ").trim();
        return normalized.toUpperCase(Locale.ROOT);
    }

    public static String normalizePositionTitle(String raw) {
        if (raw == null) {
            return "";
        }
        String normalized = WHITESPACE.matcher(raw.trim()).replaceAll(" ");
        return normalized.toUpperCase(Locale.ROOT);
    }

    /**
     * 플랫폼 간 직무명 표기 차이(예: "AI 개발 엔지니어" vs "AI 개발 엔지니어(신입/Java개발)")를
     * 완화하여 중복 매칭에 사용하는 직무명 핵심 비교 키를 생성한다.
     */
    public static String normalizePositionTitleKey(String raw) {
        if (raw == null) {
            return "";
        }
        String normalized = raw.trim();
        // 괄호 안의 고용형태/자격요건/경력 태그 제거 (예: (신입/Java개발), [신입/경력], (인턴))
        normalized = normalized.replaceAll("(?i)[\\[\\(][^\\]\\)]*?(?:신입|경력|인턴|정규직|계약직|프리랜서)[^\\]\\)]*?[\\]\\)]", "");
        // "채용" 보일러플레이트 제거
        normalized = normalized.replaceAll("(?i)\\s*채용\\s*", " ");
        // 특수문자 제거 및 공백/대소문자 정규화
        normalized = WHITESPACE.matcher(normalized).replaceAll(" ").trim();
        return normalized.toUpperCase(Locale.ROOT);
    }
}
