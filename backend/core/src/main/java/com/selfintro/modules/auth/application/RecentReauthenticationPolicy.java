package com.selfintro.modules.auth.application;

import jakarta.servlet.http.HttpSession;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.stereotype.Component;

@Component
public class RecentReauthenticationPolicy {

    public static final String REAUTHENTICATED_AT_ATTRIBUTE = "SELF_INTRO_REAUTHENTICATED_AT";
    public static final String EXPLICIT_REAUTHENTICATED_AT_ATTRIBUTE =
            "SELF_INTRO_EXPLICIT_REAUTHENTICATED_AT";

    private final Duration validFor;

    public RecentReauthenticationPolicy(
            @Value("${app.security.reauthentication.valid-for:10m}") Duration validFor) {
        this.validFor = validFor;
    }

    public void requireRecent(HttpSession session) {
        requireTimestamp(session.getAttribute(REAUTHENTICATED_AT_ATTRIBUTE));
    }

    public void requireExplicitRecent(HttpSession session) {
        requireTimestamp(session.getAttribute(EXPLICIT_REAUTHENTICATED_AT_ATTRIBUTE));
    }

    public Long expiresAtEpochMillis(HttpSession session) {
        return expiresAtEpochMillis(session.getAttribute(REAUTHENTICATED_AT_ATTRIBUTE));
    }

    public Long explicitExpiresAtEpochMillis(HttpSession session) {
        return expiresAtEpochMillis(session.getAttribute(EXPLICIT_REAUTHENTICATED_AT_ATTRIBUTE));
    }

    public void expire(HttpSession session) {
        session.removeAttribute(REAUTHENTICATED_AT_ATTRIBUTE);
        session.removeAttribute(EXPLICIT_REAUTHENTICATED_AT_ATTRIBUTE);
    }

    private void requireTimestamp(Object value) {
        if (expiresAtEpochMillis(value) == null) {
            throw new InsufficientAuthenticationException("비밀번호 재확인이 필요합니다.");
        }
    }

    private Long expiresAtEpochMillis(Object value) {
        if (!(value instanceof Long reauthenticatedAt)) {
            return null;
        }
        long expiresAt = reauthenticatedAt + validFor.toMillis();
        return expiresAt > System.currentTimeMillis() ? expiresAt : null;
    }
}
