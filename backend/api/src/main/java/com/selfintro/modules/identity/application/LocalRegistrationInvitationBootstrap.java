package com.selfintro.modules.identity.application;

import com.selfintro.modules.identity.domain.RegistrationInvitation;
import com.selfintro.modules.identity.domain.RegistrationInvitationRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.registration.local-invitation.enabled", havingValue = "true")
public class LocalRegistrationInvitationBootstrap implements ApplicationRunner {

    private final RegistrationInvitationRepository invitationRepository;
    private final RegistrationSecretHasher secretHasher;

    @Value("${app.registration.local-invitation.code:}")
    private String code;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (code.isBlank()) {
            throw new IllegalStateException("로컬 초대 코드가 필요합니다.");
        }
        byte[] hash = secretHasher.hash(code);
        if (invitationRepository.findByCodeHash(hash).isEmpty()) {
            invitationRepository.save(
                    RegistrationInvitation.issue(
                            hash, LocalDateTime.now().plusDays(30), 100, null));
        }
    }
}
