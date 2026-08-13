package com.selfintro.modules.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.auth.application.SessionSecurityService;
import com.selfintro.modules.identity.domain.AppUser;
import com.selfintro.modules.identity.domain.AppUserRepository;
import com.selfintro.modules.identity.domain.PasswordResetToken;
import com.selfintro.modules.identity.domain.PasswordResetTokenRepository;
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

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock AppUserRepository appUserRepository;
    @Mock PasswordResetTokenRepository tokenRepository;
    @Mock RegistrationSecretHasher secretHasher;
    @Mock RegistrationPasswordPolicy passwordPolicy;
    @Mock PasswordEncoder passwordEncoder;
    @Mock PasswordResetEmailSender emailSender;
    @Mock SessionSecurityService sessionSecurityService;
    @Mock SecurityAuditService securityAuditService;

    PasswordResetService service;

    @BeforeEach
    void setUp() {
        service =
                new PasswordResetService(
                        appUserRepository,
                        tokenRepository,
                        secretHasher,
                        passwordPolicy,
                        passwordEncoder,
                        emailSender,
                        sessionSecurityService,
                        securityAuditService);
        ReflectionTestUtils.setField(service, "tokenValidFor", Duration.ofMinutes(30));
    }

    @Test
    void unknownEmailReturnsWithoutRevealingAccountExistence() {
        when(appUserRepository.findByEmailCanonical("missing@example.com"))
                .thenReturn(Optional.empty());

        service.request(" Missing@Example.com ");

        verify(emailSender).ensureAvailable();
        verify(tokenRepository, never()).save(any());
        verify(emailSender, never()).send(any(), any());
    }

    @Test
    void activeAccountGetsOneHashedExpiringTokenAndMail() {
        AppUser user =
                AppUser.createBootstrapOwner("usr-1", "old-hash", "사용자", "member@example.com");
        ReflectionTestUtils.setField(user, "id", 7L);
        when(appUserRepository.findByEmailCanonical("member@example.com"))
                .thenReturn(Optional.of(user));
        when(secretHasher.hash(any())).thenReturn(new byte[32]);

        service.request("member@example.com");

        verify(tokenRepository).deleteAllByUserId(7L);
        ArgumentCaptor<PasswordResetToken> tokenCaptor =
                ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokenRepository).save(tokenCaptor.capture());
        PasswordResetToken saved = tokenCaptor.getValue();
        assertThat(saved.getUserId()).isEqualTo(7L);
        assertThat(saved.getExpiresAt()).isAfter(saved.getCreatedAt());
        verify(emailSender).send(org.mockito.ArgumentMatchers.eq("member@example.com"), any());
        verify(securityAuditService)
                .recordPlatformTargetAction("PASSWORD_RESET_REQUESTED", null, "APP_USER", 7L);
    }

    @Test
    void deliveryFailureRevokesTheNewTokenAndRecordsOnlyFailure() {
        AppUser user =
                AppUser.createBootstrapOwner("usr-1", "old-hash", "사용자", "member@example.com");
        ReflectionTestUtils.setField(user, "id", 7L);
        when(appUserRepository.findByEmailCanonical("member@example.com"))
                .thenReturn(Optional.of(user));
        when(secretHasher.hash(any())).thenReturn(new byte[32]);
        doThrow(new IllegalStateException("smtp unavailable"))
                .when(emailSender)
                .send(org.mockito.ArgumentMatchers.eq("member@example.com"), any());

        service.request("member@example.com");

        verify(tokenRepository, org.mockito.Mockito.times(2)).deleteAllByUserId(7L);
        verify(securityAuditService)
                .recordPlatformTargetAction("PASSWORD_RESET_DELIVERY_FAILED", null, "APP_USER", 7L);
        verify(securityAuditService, never())
                .recordPlatformTargetAction("PASSWORD_RESET_REQUESTED", null, "APP_USER", 7L);
    }

    @Test
    void validTokenChangesPasswordAndRevokesEverySession() {
        AppUser user =
                AppUser.createBootstrapOwner("usr-2", "old-hash", "사용자", "member@example.com");
        ReflectionTestUtils.setField(user, "id", 8L);
        PasswordResetToken token =
                PasswordResetToken.issue(
                        8L, new byte[32], LocalDateTime.now().plusMinutes(30), LocalDateTime.now());
        when(secretHasher.hash("raw-token")).thenReturn(new byte[32]);
        when(tokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));
        when(appUserRepository.findByIdForUpdate(8L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("NewPassword1!", "old-hash")).thenReturn(false);
        when(passwordEncoder.encode("NewPassword1!")).thenReturn("new-hash");

        service.confirm("raw-token", "NewPassword1!");

        verify(passwordPolicy).validate("NewPassword1!");
        assertThat(user.getPasswordHash()).isEqualTo("new-hash");
        assertThat(token.getUsedAt()).isNotNull();
        verify(sessionSecurityService).revokeAll("usr-2");
        verify(securityAuditService)
                .recordPlatformTargetAction("PASSWORD_RESET_COMPLETED", null, "APP_USER", 8L);
    }

    @Test
    void expiredTokenCannotChangePassword() {
        PasswordResetToken token =
                PasswordResetToken.issue(
                        8L,
                        new byte[32],
                        LocalDateTime.now().minusSeconds(1),
                        LocalDateTime.now().minusMinutes(31));
        when(secretHasher.hash("expired-token")).thenReturn(new byte[32]);
        when(tokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.confirm("expired-token", "NewPassword1!"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("만료");

        verify(appUserRepository, never()).findByIdForUpdate(any());
        verify(sessionSecurityService, never()).revokeAll(any());
    }
}
