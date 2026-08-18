package com.selfintro.modules.identity.infrastructure;

import com.selfintro.modules.identity.application.EmailVerificationSender;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
@ConditionalOnProperty(
        name = "app.registration.email.enabled",
        havingValue = "false",
        matchIfMissing = true)
public class UnavailableEmailVerificationSender implements EmailVerificationSender {

    @Override
    public void send(String email, String rawToken) {
        throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE, "이메일 확인 서비스가 준비되지 않았습니다.");
    }
}
