package com.selfintro.modules.auth.application;

import com.selfintro.modules.securityaudit.application.AuthenticationAuditListener.AuthenticationAuditSignal;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthenticationRateLimitService {

    private static final DefaultRedisScript<Long> INCREMENT_WITH_EXPIRY =
            new DefaultRedisScript<>(
                    "local n=redis.call('INCR',KEYS[1]);"
                            + "if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]); end;"
                            + "return n;",
                    Long.class);

    private final ObjectProvider<RedisConnectionFactory> connectionFactoryProvider;
    private final RequestFingerprintService requestFingerprintService;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${app.security.rate-limit.enabled:false}")
    private boolean enabled;

    @Value("${app.security.rate-limit.login.max-attempts:10}")
    private long loginMaxAttempts;

    @Value("${app.security.rate-limit.login.window:1m}")
    private Duration loginWindow;

    @Value("${app.security.rate-limit.registration.max-attempts:5}")
    private long registrationMaxAttempts;

    @Value("${app.security.rate-limit.registration.window:10m}")
    private Duration registrationWindow;

    @Value("${app.security.rate-limit.password-reset.max-attempts:5}")
    private long passwordResetMaxAttempts;

    @Value("${app.security.rate-limit.password-reset.window:10m}")
    private Duration passwordResetWindow;

    public void requireLoginAllowance(String username, HttpServletRequest request) {
        requireAllowance("login", username, request, loginMaxAttempts, loginWindow);
    }

    public void requireRegistrationAllowance(String email, HttpServletRequest request) {
        requireAllowance(
                "registration", email, request, registrationMaxAttempts, registrationWindow);
    }

    public void requirePasswordResetAllowance(String email, HttpServletRequest request) {
        requireAllowance(
                "password-reset", email, request, passwordResetMaxAttempts, passwordResetWindow);
    }

    private void requireAllowance(
            String action,
            String subject,
            HttpServletRequest request,
            long maxAttempts,
            Duration window) {
        if (!enabled) {
            return;
        }
        RedisConnectionFactory connectionFactory = connectionFactoryProvider.getIfAvailable();
        if (connectionFactory == null) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "인증 보호 저장소를 사용할 수 없습니다.");
        }

        var fingerprint = requestFingerprintService.create(request);
        String subjectHash = requestFingerprintService.hashIdentifier(subject);
        long retryAfterSeconds = Math.max(1, window.toSeconds());
        StringRedisTemplate redis = new StringRedisTemplate(connectionFactory);
        try {
            enforce(
                    redis,
                    "self-intro:auth-rate:" + action + ":ip:" + fingerprint.ipHash(),
                    maxAttempts,
                    window,
                    retryAfterSeconds,
                    action);
            enforce(
                    redis,
                    "self-intro:auth-rate:" + action + ":subject:" + subjectHash,
                    maxAttempts,
                    window,
                    retryAfterSeconds,
                    action);
        } catch (AuthenticationRateLimitExceededException exception) {
            throw exception;
        } catch (DataAccessException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "인증 보호 저장소를 사용할 수 없습니다.", exception);
        }
    }

    private void enforce(
            StringRedisTemplate redis,
            String key,
            long maxAttempts,
            Duration window,
            long retryAfterSeconds,
            String action) {
        Long attempts =
                redis.execute(
                        INCREMENT_WITH_EXPIRY,
                        List.of(key),
                        Long.toString(Math.max(1, window.toMillis())));
        if (attempts != null && attempts > maxAttempts) {
            eventPublisher.publishEvent(
                    new AuthenticationAuditSignal(
                            "AUTH_RATE_LIMITED", null, "DENIED", action.toUpperCase()));
            throw new AuthenticationRateLimitExceededException(retryAfterSeconds);
        }
    }
}
