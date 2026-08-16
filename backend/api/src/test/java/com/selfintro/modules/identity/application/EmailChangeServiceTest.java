package com.selfintro.modules.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.auth.application.SessionSecurityService;
import com.selfintro.modules.identity.domain.AppUser;
import com.selfintro.modules.identity.domain.AppUserRepository;
import com.selfintro.modules.identity.domain.EmailChangeToken;
import com.selfintro.modules.identity.domain.EmailChangeTokenRepository;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class EmailChangeServiceTest {

    @Mock AppUserRepository appUserRepository;
    @Mock EmailChangeTokenRepository tokenRepository;
    @Mock RegistrationSecretHasher secretHasher;
    @Mock PasswordEncoder passwordEncoder;
    @Mock EmailChangeSender emailSender;
    @Mock SessionSecurityService sessionSecurityService;
    @Mock SecurityAuditService securityAuditService;

    EmailChangeService service;

    @BeforeEach
    void setUp() {
        service =
                new EmailChangeService(
                        appUserRepository,
                        tokenRepository,
                        secretHasher,
                        passwordEncoder,
                        emailSender,
                        sessionSecurityService,
                        securityAuditService);
        ReflectionTestUtils.setField(service, "tokenValidFor", Duration.ofMinutes(30));
    }

    @Test
    void requestKeepsCurrentAddressAndStoresOnlyHashedToken() {
        AppUser user = activeUser(7L, "old@example.com");
        when(appUserRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("current", "hash")).thenReturn(true);
        when(appUserRepository.existsByEmailCanonical("new@example.com")).thenReturn(false);
        when(secretHasher.hash(any())).thenReturn(new byte[32]);

        service.request(7L, "current", " New@Example.com ");

        assertThat(user.getEmail()).isEqualTo("old@example.com");
        ArgumentCaptor<EmailChangeToken> captor = ArgumentCaptor.forClass(EmailChangeToken.class);
        verify(tokenRepository).save(captor.capture());
        assertThat(captor.getValue().getNewEmail()).isEqualTo("New@Example.com");
        assertThat(captor.getValue().getNewEmailCanonical()).isEqualTo("new@example.com");
        verify(emailSender).send(eq("New@Example.com"), any());
        verify(securityAuditService)
                .recordPlatformTargetAction("ACCOUNT_EMAIL_CHANGE_REQUESTED", 7L, "APP_USER", 7L);
    }

    @Test
    void deliveryFailureRemovesPendingToken() {
        AppUser user = activeUser(7L, "old@example.com");
        when(appUserRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("current", "hash")).thenReturn(true);
        when(appUserRepository.existsByEmailCanonical("new@example.com")).thenReturn(false);
        when(secretHasher.hash(any())).thenReturn(new byte[32]);
        doThrow(new IllegalStateException("smtp unavailable"))
                .when(emailSender)
                .send(eq("new@example.com"), any());

        assertThatThrownBy(() -> service.request(7L, "current", "new@example.com"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("확인 메일");

        verify(tokenRepository, org.mockito.Mockito.times(2)).deleteAllByUserId(7L);
        verify(securityAuditService)
                .recordPlatformTargetAction(
                        "ACCOUNT_EMAIL_CHANGE_DELIVERY_FAILED", 7L, "APP_USER", 7L);
    }

    @Test
    void confirmRechecksCollisionThenChangesAddressAndRevokesSessions() {
        AppUser user = activeUser(8L, "old@example.com");
        EmailChangeToken token =
                EmailChangeToken.issue(
                        8L,
                        "new@example.com",
                        "new@example.com",
                        new byte[32],
                        LocalDateTime.now().plusMinutes(30),
                        LocalDateTime.now());
        when(secretHasher.hash("raw-token")).thenReturn(new byte[32]);
        when(tokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));
        when(appUserRepository.findByIdForUpdate(8L)).thenReturn(Optional.of(user));
        when(appUserRepository.existsByEmailCanonicalAndIdNot("new@example.com", 8L))
                .thenReturn(false);

        assertThat(service.confirm("raw-token")).isEqualTo("new@example.com");

        assertThat(user.getEmailCanonical()).isEqualTo("new@example.com");
        assertThat(token.getUsedAt()).isNotNull();
        verify(sessionSecurityService).revokeAll("usr-8");
        verify(securityAuditService)
                .recordPlatformTargetAction("ACCOUNT_EMAIL_CHANGED", 8L, "APP_USER", 8L);
    }

    @Test
    void confirmRejectsAddressClaimedAfterRequest() {
        AppUser user = activeUser(8L, "old@example.com");
        EmailChangeToken token =
                EmailChangeToken.issue(
                        8L,
                        "new@example.com",
                        "new@example.com",
                        new byte[32],
                        LocalDateTime.now().plusMinutes(30),
                        LocalDateTime.now());
        when(secretHasher.hash("raw-token")).thenReturn(new byte[32]);
        when(tokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));
        when(appUserRepository.findByIdForUpdate(8L)).thenReturn(Optional.of(user));
        when(appUserRepository.existsByEmailCanonicalAndIdNot("new@example.com", 8L))
                .thenReturn(true);

        assertThatThrownBy(() -> service.confirm("raw-token"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("다른 계정");

        assertThat(user.getEmail()).isEqualTo("old@example.com");
        verify(sessionSecurityService, never()).revokeAll(any());
    }

    private AppUser activeUser(Long id, String email) {
        AppUser user = AppUser.createBootstrapOwner("usr-" + id, "hash", "사용자", email);
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }
}
