package com.selfintro.modules.securityaudit.application;

import com.selfintro.modules.securityaudit.domain.SecurityAuditEvent;
import com.selfintro.modules.securityaudit.domain.SecurityAuditEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuthenticationAuditListener {

    private final SecurityAuditEventRepository auditEventRepository;

    @EventListener
    public void onCompletedAuthentication(AuthenticationAuditSignal signal) {
        auditEventRepository.save(
                SecurityAuditEvent.authentication(
                        signal.eventType(),
                        signal.actorUserId(),
                        signal.result(),
                        signal.reasonCode()));
    }

    /** 원문 username·비밀번호·TOTP·예외 메시지 대신 제한된 결과 코드만 전달한다. */
    public record AuthenticationAuditSignal(
            String eventType, Long actorUserId, String result, String reasonCode) {}
}
