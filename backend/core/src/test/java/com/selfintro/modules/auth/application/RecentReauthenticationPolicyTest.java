package com.selfintro.modules.auth.application;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.InsufficientAuthenticationException;

class RecentReauthenticationPolicyTest {

    private final RecentReauthenticationPolicy policy =
            new RecentReauthenticationPolicy(Duration.ofMinutes(10));

    @Test
    void loginTimestampDoesNotSatisfyExplicitReauthentication() {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(
                RecentReauthenticationPolicy.REAUTHENTICATED_AT_ATTRIBUTE,
                System.currentTimeMillis());

        assertThatCode(() -> policy.requireRecent(session)).doesNotThrowAnyException();
        assertThatThrownBy(() -> policy.requireExplicitRecent(session))
                .isInstanceOf(InsufficientAuthenticationException.class);
    }

    @Test
    void explicitReauthenticationTimestampSatisfiesDestructiveActionPolicy() {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(
                RecentReauthenticationPolicy.EXPLICIT_REAUTHENTICATED_AT_ATTRIBUTE,
                System.currentTimeMillis());

        assertThatCode(() -> policy.requireExplicitRecent(session)).doesNotThrowAnyException();
    }
}
