package com.selfintro.modules.identity.infrastructure;

import com.selfintro.modules.identity.application.PasswordResetEmailSender;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
@ConditionalOnProperty(
        name = "app.account-recovery.email.enabled",
        havingValue = "false",
        matchIfMissing = true)
public class UnavailablePasswordResetEmailSender implements PasswordResetEmailSender {

    @Override
    public void ensureAvailable() {
        throw unavailable();
    }

    @Override
    public void send(String email, String rawToken) {
        throw unavailable();
    }

    private ResponseStatusException unavailable() {
        return new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE, "비밀번호 재설정 메일 서비스가 준비되지 않았습니다.");
    }
}
