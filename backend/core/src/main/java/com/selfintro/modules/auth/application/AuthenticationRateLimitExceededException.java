package com.selfintro.modules.auth.application;

public class AuthenticationRateLimitExceededException extends RuntimeException {

    private final long retryAfterSeconds;

    public AuthenticationRateLimitExceededException(long retryAfterSeconds) {
        super("인증 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
        this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
    }

    public long retryAfterSeconds() {
        return retryAfterSeconds;
    }
}
