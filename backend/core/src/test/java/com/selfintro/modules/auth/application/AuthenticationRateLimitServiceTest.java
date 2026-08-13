package com.selfintro.modules.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

class AuthenticationRateLimitServiceTest {

    @Test
    void passwordResetRateLimitUsesRestrictedAuditCode() {
        assertThat(AuthenticationRateLimitService.auditReasonCode("password-reset"))
                .isEqualTo("PASSWORD_RESET");
    }

    @Test
    void disabledLimiterDoesNotRequireRedis() {
        AuthenticationRateLimitService service = serviceWith(null, false);

        assertThatCode(
                        () ->
                                service.requireLoginAllowance(
                                        "user@example.com", request("127.0.0.1")))
                .doesNotThrowAnyException();
    }

    @Test
    void enabledLimiterFailsClosedWhenRedisIsUnavailable() {
        AuthenticationRateLimitService service = serviceWith(null, true);

        assertThatThrownBy(
                        () ->
                                service.requireRegistrationAllowance(
                                        "user@example.com", request("127.0.0.1")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("503 SERVICE_UNAVAILABLE");
    }

    private AuthenticationRateLimitService serviceWith(
            RedisConnectionFactory connectionFactory, boolean enabled) {
        @SuppressWarnings("unchecked")
        ObjectProvider<RedisConnectionFactory> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(connectionFactory);
        AuthenticationRateLimitService service =
                new AuthenticationRateLimitService(
                        provider,
                        new RequestFingerprintService("test-pepper"),
                        mock(ApplicationEventPublisher.class));
        ReflectionTestUtils.setField(service, "enabled", enabled);
        ReflectionTestUtils.setField(service, "loginMaxAttempts", 10L);
        ReflectionTestUtils.setField(service, "loginWindow", java.time.Duration.ofMinutes(1));
        ReflectionTestUtils.setField(service, "registrationMaxAttempts", 5L);
        ReflectionTestUtils.setField(
                service, "registrationWindow", java.time.Duration.ofMinutes(10));
        return service;
    }

    private HttpServletRequest request(String remoteAddress) {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn(remoteAddress);
        return request;
    }
}
