package com.selfintro.modules.identity.infrastructure;

import com.selfintro.modules.identity.application.InvitationEmailSender;
import java.time.LocalDateTime;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
@ConditionalOnProperty(
        name = "app.registration.email.enabled",
        havingValue = "false",
        matchIfMissing = true)
public class UnavailableInvitationEmailSender implements InvitationEmailSender {
    @Override
    public void send(String email, String invitationUrl, LocalDateTime expiresAt) {
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "초대 메일 발송기가 준비되지 않았습니다.");
    }
}
