package com.selfintro.modules.jobposting.domain.util;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 채용 공고 URL을 표준(Canonical) 형태로 정규화한다. 추적 파라미터(utm_*, rf, sc 등) 및 fragments(#...)를 제거하고,
 * 사람인/잡코리아/원티드 등 채용 플랫폼별 고유 식별자(rec_idx, GI_No, wd_id) 중심의 표준 URL로 변환하여 동일 공고의 중복 수집을 막는다.
 */
public final class JobPostingUrlNormalizer {

    private static final Pattern SARAMIN_REC_IDX_PATTERN = Pattern.compile("rec_idx=([^&\\s#]+)");

    private static final Pattern JOBKOREA_GI_NO_PATTERN =
            Pattern.compile("(?:GI_Read/|GI_No=)(\\d+)");

    private static final Pattern WANTED_WD_ID_PATTERN = Pattern.compile("/wd/(\\d+)");

    private JobPostingUrlNormalizer() {}

    /** 입력 URL을 표준 Canonical URL로 정규화한다. 올바르지 않거나 빈 URL인 경우 null 또는 정제된 기본 URL을 반환한다. */
    public static String normalizeUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            return null;
        }

        // 유니코드 서식 문자, non-breaking space, html 엔티티 정제
        String cleaned = rawUrl.replaceAll("[\\p{Cf}\\u00A0]", "").replace("&amp;", "&").trim();
        if (!cleaned.contains("://")) {
            cleaned = "https://" + cleaned;
        }

        // Fragment (#) 제거
        int hashIdx = cleaned.indexOf('#');
        if (hashIdx >= 0) {
            cleaned = cleaned.substring(0, hashIdx);
        }

        String host = extractHost(cleaned);
        if (host == null) {
            return cleaned;
        }

        String lowerHost = host.toLowerCase(Locale.ROOT);

        // 사람인: rec_idx 추출 후 zf_user/jobs/view?rec_idx=X 로 통일
        if (lowerHost.endsWith("saramin.co.kr")) {
            Matcher matcher = SARAMIN_REC_IDX_PATTERN.matcher(cleaned);
            if (matcher.find()) {
                String recIdx = matcher.group(1);
                return "https://www.saramin.co.kr/zf_user/jobs/view?rec_idx=" + recIdx;
            }
        }

        // 잡코리아: GI_No 또는 GI_Read/{giNo} 추출 후 /Recruit/GI_Read/{giNo} 로 통일
        if (lowerHost.endsWith("jobkorea.co.kr")) {
            Matcher matcher = JOBKOREA_GI_NO_PATTERN.matcher(cleaned);
            if (matcher.find()) {
                String giNo = matcher.group(1);
                return "https://www.jobkorea.co.kr/Recruit/GI_Read/" + giNo;
            }
        }

        // 원티드: /wd/{id} 추출 후 /wd/{id} 로 통일
        if (lowerHost.endsWith("wanted.co.kr")) {
            Matcher matcher = WANTED_WD_ID_PATTERN.matcher(cleaned);
            if (matcher.find()) {
                String wdId = matcher.group(1);
                return "https://www.wanted.co.kr/wd/" + wdId;
            }
        }

        // 기본: 추적용 Query Parameter (utm_*, rf, sc, Oem_Code 등) 제거
        return stripTrackingQueryParams(cleaned);
    }

    /** URL에서 안전하게 host(도메인)를 추출한다. URI.create()의 문법 예외 시에도 롤백 정규식 처리하여 예외 없이 host를 돌려준다. */
    public static String extractHost(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            return null;
        }
        String cleaned = rawUrl.replaceAll("[\\p{Cf}\\u00A0]", "").trim();
        if (!cleaned.contains("://")) {
            cleaned = "https://" + cleaned;
        }
        try {
            URI uri = new URI(cleaned);
            if (uri.getHost() != null) {
                return uri.getHost();
            }
        } catch (URISyntaxException ignored) {
        }

        // URI parsing 실패 시 정규식 fallback
        Matcher matcher = Pattern.compile("https?://([^/?:#]+)").matcher(cleaned);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    private static String stripTrackingQueryParams(String url) {
        int qIdx = url.indexOf('?');
        if (qIdx < 0) {
            return url;
        }
        String baseUrl = url.substring(0, qIdx);
        String queryString = url.substring(qIdx + 1);

        StringBuilder sb = new StringBuilder();
        for (String pair : queryString.split("&")) {
            if (pair.isBlank()) continue;
            int eq = pair.indexOf('=');
            String key = eq >= 0 ? pair.substring(0, eq) : pair;
            String lowerKey = key.toLowerCase(Locale.ROOT);

            // 주요 마케팅/추적용 파라미터 제외
            if (lowerKey.startsWith("utm_")
                    || lowerKey.equals("rf")
                    || lowerKey.equals("sc")
                    || lowerKey.equals("oem_code")
                    || lowerKey.equals("view_type")) {
                continue;
            }
            if (sb.length() > 0) {
                sb.append("&");
            }
            sb.append(pair);
        }

        return sb.length() > 0 ? baseUrl + "?" + sb : baseUrl;
    }
}
