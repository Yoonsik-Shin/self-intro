package com.selfintro.modules.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.identity.domain.EmailChangeTokenRepository;
import com.selfintro.modules.identity.domain.EmailVerificationTokenRepository;
import com.selfintro.modules.identity.domain.PasswordResetTokenRepository;
import com.selfintro.modules.identity.domain.RegistrationInvitationRepository;
import com.selfintro.modules.identity.domain.WorkspaceMembershipInvitationRepository;
import com.selfintro.modules.identity.domain.WorkspaceMembershipInvitationStatus;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class InvitationRetentionServiceTest {

    @Mock private RegistrationInvitationRepository registrationRepository;
    @Mock private EmailVerificationTokenRepository emailVerificationTokenRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private EmailChangeTokenRepository emailChangeTokenRepository;
    @Mock private WorkspaceMembershipInvitationRepository workspaceRepository;

    @Test
    void deletesOnlyBoundedCandidatesOlderThanConfiguredRetention() {
        InvitationRetentionService service =
                new InvitationRetentionService(
                        registrationRepository,
                        emailVerificationTokenRepository,
                        passwordResetTokenRepository,
                        emailChangeTokenRepository,
                        workspaceRepository);
        ReflectionTestUtils.setField(service, "closedFor", Duration.ofDays(30));
        ReflectionTestUtils.setField(service, "batchSize", 500);
        LocalDateTime now = LocalDateTime.of(2026, 8, 11, 3, 30);
        LocalDateTime cutoff = now.minusDays(30);

        when(registrationRepository.findRetentionCandidateIds(eq(cutoff), any(Pageable.class)))
                .thenReturn(List.of(1L, 2L));
        when(emailVerificationTokenRepository.findRetentionCandidateIds(
                        eq(cutoff), any(Pageable.class)))
                .thenReturn(List.of(4L, 5L));
        when(passwordResetTokenRepository.findRetentionCandidateIds(
                        eq(cutoff), any(Pageable.class)))
                .thenReturn(List.of(6L));
        when(emailChangeTokenRepository.findRetentionCandidateIds(eq(cutoff), any(Pageable.class)))
                .thenReturn(List.of(7L));
        when(workspaceRepository.findRetentionCandidateIds(
                        eq(cutoff),
                        eq(WorkspaceMembershipInvitationStatus.PENDING),
                        eq(WorkspaceMembershipInvitationStatus.ACCEPTED),
                        eq(WorkspaceMembershipInvitationStatus.REVOKED),
                        eq(WorkspaceMembershipInvitationStatus.DECLINED),
                        any(Pageable.class)))
                .thenReturn(List.of(3L));

        InvitationRetentionService.CleanupResult result = service.cleanup(now);

        assertThat(result.registrationDeleted()).isEqualTo(2);
        assertThat(result.emailVerificationDeleted()).isEqualTo(2);
        assertThat(result.passwordResetDeleted()).isEqualTo(1);
        assertThat(result.emailChangeDeleted()).isEqualTo(1);
        assertThat(result.workspaceDeleted()).isEqualTo(1);
        assertThat(result.totalDeleted()).isEqualTo(7);
        verify(registrationRepository).deleteAllByIdInBatch(List.of(1L, 2L));
        verify(emailVerificationTokenRepository).deleteAllByIdInBatch(List.of(4L, 5L));
        verify(passwordResetTokenRepository).deleteAllByIdInBatch(List.of(6L));
        verify(emailChangeTokenRepository).deleteAllByIdInBatch(List.of(7L));
        verify(workspaceRepository).deleteAllByIdInBatch(List.of(3L));
    }
}
