package com.selfintro.modules.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.identity.domain.AppUser;
import com.selfintro.modules.identity.domain.AppUserRepository;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

class MfaServiceTest {

    private final AppUserRepository appUserRepository = mock(AppUserRepository.class);
    private final TotpService totpService = mock(TotpService.class);
    private final MfaSecretCipher secretCipher = mock(MfaSecretCipher.class);
    private final MfaRecoveryCodeService recoveryCodeService = mock(MfaRecoveryCodeService.class);
    private final ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
    private MfaService service;

    @BeforeEach
    void setUp() {
        service =
                new MfaService(
                        appUserRepository,
                        totpService,
                        secretCipher,
                        recoveryCodeService,
                        eventPublisher);
        ReflectionTestUtils.setField(service, "issuer", "self-intro-test");
        ReflectionTestUtils.setField(service, "recoverySessionValidFor", Duration.ofMinutes(15));
    }

    @Test
    void recoveryCodeLoginMarksOnlyThatSessionAsEligibleForReenrollment() {
        AppUser user = mock(AppUser.class);
        when(appUserRepository.findById(42L)).thenReturn(Optional.of(user));
        when(user.getMfaSecretCiphertext()).thenReturn("old-ciphertext");
        when(secretCipher.decrypt("old-ciphertext")).thenReturn("old-secret");
        when(totpService.verify("old-secret", "ABCD-EFGH-IJKL")).thenReturn(false);
        when(recoveryCodeService.consume(42L, "ABCD-EFGH-IJKL")).thenReturn(true);
        MockHttpSession session = new MockHttpSession();

        MfaService.LoginVerification verification =
                service.verifyLogin(platformPrincipal(), "ABCD-EFGH-IJKL");
        service.recordLoginVerification(verification, session);

        assertThat(verification).isEqualTo(MfaService.LoginVerification.RECOVERY_CODE);
        assertThat(service.canRecoverMfa(platformPrincipal(), session)).isTrue();
        assertThat(service.requiresRecoveryReenrollment(platformPrincipal(), session)).isTrue();
    }

    @Test
    void recoveryEnrollmentRequiresRecoveryAuthenticatedSession() {
        assertThatThrownBy(
                        () ->
                                service.beginRecoveryEnrollment(
                                        platformPrincipal(), new MockHttpSession()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void confirmationReplacesSecretAndRecoveryCodesOnlyAfterNewTotpVerification() {
        MockHttpSession session = new MockHttpSession();
        service.recordLoginVerification(MfaService.LoginVerification.RECOVERY_CODE, session);
        when(totpService.newSecret()).thenReturn("new-secret");
        when(totpService.verify("new-secret", "123456")).thenReturn(true);
        when(secretCipher.encrypt("new-secret")).thenReturn("new-ciphertext");
        when(recoveryCodeService.replaceFor(42L)).thenReturn(List.of("NEW1-CODE-0001"));
        AppUser user = mock(AppUser.class);
        when(appUserRepository.findById(42L)).thenReturn(Optional.of(user));

        MfaService.Enrollment enrollment =
                service.beginRecoveryEnrollment(platformPrincipal(), session);
        MfaService.RecoveryCodes result =
                service.confirmRecoveryEnrollment(platformPrincipal(), "123456", session);

        assertThat(enrollment.secret()).isEqualTo("new-secret");
        assertThat(result.codes()).containsExactly("NEW1-CODE-0001");
        assertThat(service.canRecoverMfa(platformPrincipal(), session)).isFalse();
        assertThat(service.requiresRecoveryReenrollment(platformPrincipal(), session)).isFalse();
        verify(user).enableMfa("new-ciphertext");
        verify(recoveryCodeService).replaceFor(42L);
    }

    private AppUserPrincipal platformPrincipal() {
        return new AppUserPrincipal(
                42L,
                "owner@example.com",
                "password-hash",
                true,
                true,
                Set.of("PLATFORM_OWNER"),
                List.of());
    }
}
