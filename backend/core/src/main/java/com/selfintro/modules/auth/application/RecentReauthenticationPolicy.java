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

    private void requireTimestamp(Object value) {
        if (!(value instanceof Long reauthenticatedAt)
                || System.currentTimeMillis() - reauthenticatedAt > validFor.toMillis()) {
            throw new InsufficientAuthenticationException("비밀번호 재확인이 필요합니다.");
        }
    }
}
