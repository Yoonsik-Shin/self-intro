package com.selfintro.modules.visitor.presentation;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
public class VisitorRequestIdentity {
    public static final String VISITOR_COOKIE = "portfolio_visitor";
    private static final Duration COOKIE_MAX_AGE = Duration.ofDays(365);

    @Value("${app.cookie-domain:}")
    private String cookieDomain;

    @Value("${app.visitor.cookie-secure:false}")
    private boolean cookieSecure;

    @Value("${app.visitor.excluded-ips:}")
    private String excludedIps;

    public boolean shouldSkip(Authentication authentication, HttpServletRequest request) {
        return isPlatformAdmin(authentication) || isExcludedIp(request);
    }

    public String resolveHash(String visitorId, HttpServletResponse response) {
        String resolvedVisitorId = visitorId;
        if (!isValidVisitorId(resolvedVisitorId)) {
            resolvedVisitorId = UUID.randomUUID().toString();
            response.addHeader(
                    HttpHeaders.SET_COOKIE, createVisitorCookie(resolvedVisitorId).toString());
        }
        return hash(resolvedVisitorId);
    }

    private boolean isPlatformAdmin(Authentication authentication) {
        return authentication != null
                && authentication.getAuthorities().stream()
                        .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }

    private boolean isExcludedIp(HttpServletRequest request) {
        Set<String> excluded =
                Arrays.stream(excludedIps.split(","))
                        .map(String::trim)
                        .filter(value -> !value.isEmpty())
                        .collect(Collectors.toSet());
        if (excluded.isEmpty()) return false;

        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null) {
            for (String candidate : forwardedFor.split(",")) {
                if (excluded.contains(normalizeIp(candidate))) return true;
            }
        }
        String realIp = request.getHeader("X-Real-IP");
        return (realIp != null && excluded.contains(normalizeIp(realIp)))
                || excluded.contains(normalizeIp(request.getRemoteAddr()));
    }

    private String normalizeIp(String value) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.startsWith("[") && normalized.contains("]")) {
            return normalized.substring(1, normalized.indexOf(']'));
        }
        long colonCount = normalized.chars().filter(character -> character == ':').count();
        if (colonCount == 1) {
            return normalized.substring(0, normalized.indexOf(':'));
        }
        return normalized;
    }

    private ResponseCookie createVisitorCookie(String visitorId) {
        ResponseCookie.ResponseCookieBuilder builder =
                ResponseCookie.from(VISITOR_COOKIE, visitorId)
                        .httpOnly(true)
                        .secure(cookieSecure)
                        .sameSite("Lax")
                        .path("/")
                        .maxAge(COOKIE_MAX_AGE);
        if (!cookieDomain.isBlank()) {
            builder.domain(cookieDomain);
        }
        return builder.build();
    }

    private boolean isValidVisitorId(String visitorId) {
        if (visitorId == null) return false;
        try {
            UUID.fromString(visitorId);
            return true;
        } catch (IllegalArgumentException ignored) {
            return false;
        }
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 알고리즘을 사용할 수 없습니다.", exception);
        }
    }
}
