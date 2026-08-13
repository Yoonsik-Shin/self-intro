package com.selfintro.modules.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.auth.domain.MfaRecoveryCodeRepository;
import com.selfintro.modules.identity.domain.AppUser;
import com.selfintro.modules.identity.domain.AppUserRepository;
import com.selfintro.modules.identity.domain.EmailChangeTokenRepository;
import com.selfintro.modules.identity.domain.EmailVerificationTokenRepository;
import com.selfintro.modules.identity.domain.MembershipStatus;
import com.selfintro.modules.identity.domain.PasswordResetTokenRepository;
import com.selfintro.modules.identity.domain.UserPlatformRoleRepository;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceMemberRepository;
import com.selfintro.modules.identity.domain.WorkspaceMembershipInvitation;
import com.selfintro.modules.identity.domain.WorkspaceMembershipInvitationRepository;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class AccountWithdrawalServiceTest {

    @Mock AppUserRepository appUserRepository;
    @Mock WorkspaceMemberRepository workspaceMemberRepository;
    @Mock WorkspaceMembershipInvitationRepository invitationRepository;
    @Mock EmailVerificationTokenRepository emailVerificationTokenRepository;
    @Mock PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock EmailChangeTokenRepository emailChangeTokenRepository;
    @Mock MfaRecoveryCodeRepository mfaRecoveryCodeRepository;
    @Mock UserPlatformRoleRepository userPlatformRoleRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock SecurityAuditService securityAuditService;

    AccountWithdrawalService service;

    @BeforeEach
    void setUp() {
        service =
                new AccountWithdrawalService(
                        appUserRepository,
                        workspaceMemberRepository,
                        invitationRepository,
                        emailVerificationTokenRepository,
                        passwordResetTokenRepository,
                        emailChangeTokenRepository,
                        mfaRecoveryCodeRepository,
                        userPlatformRoleRepository,
                        passwordEncoder,
                        securityAuditService);
    }

    @Test
    void blocksWithdrawalWhileUserOwnsActiveWorkspace() {
        AppUser user = AppUser.createBootstrapOwner("owner", "hash", "소유자", "owner@test.local");
        Workspace workspace = Workspace.createPrivatePersonal("내 Workspace");
        WorkspaceMember owner = WorkspaceMember.owner(workspace, user);
        when(appUserRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        when(workspaceMemberRepository.findAllByUserIdAndStatusForUpdate(
                        1L, MembershipStatus.ACTIVE))
                .thenReturn(List.of(owner));
        when(userPlatformRoleRepository.findAllByUserId(1L)).thenReturn(List.of());

        assertThatThrownBy(() -> service.withdraw(1L, AccountWithdrawalService.CONFIRMATION_PHRASE))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("소유권 또는 플랫폼 역할");

        verify(emailVerificationTokenRepository, never()).deleteAllByUserId(any());
    }

    @Test
    void suspendsMembershipsAndRedactsIdentityAndInvitation() {
        AppUser user = AppUser.createBootstrapOwner("member", "hash", "회원", "member@test.local");
        Workspace workspace = Workspace.createPrivatePersonal("팀 Workspace");
        WorkspaceMember member = WorkspaceMember.active(workspace, user, WorkspaceRole.EDITOR);
        WorkspaceMembershipInvitation invitation =
                WorkspaceMembershipInvitation.issue(
                        7L,
                        10L,
                        "member@test.local",
                        WorkspaceRole.VIEWER,
                        new byte[32],
                        LocalDateTime.now().plusDays(1));
        when(appUserRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(user));
        when(workspaceMemberRepository.findAllByUserIdAndStatusForUpdate(
                        2L, MembershipStatus.ACTIVE))
                .thenReturn(List.of(member));
        when(userPlatformRoleRepository.findAllByUserId(2L)).thenReturn(List.of());
        when(invitationRepository.findAllByRecipientEmailCanonical("member@test.local"))
                .thenReturn(List.of(invitation));
        when(passwordEncoder.encode(anyString())).thenReturn("invalidated-hash");

        service.withdraw(2L, AccountWithdrawalService.CONFIRMATION_PHRASE);

        assertThat(user.isActive()).isFalse();
        assertThat(user.getEmail()).isNull();
        assertThat(user.getEmailCanonical()).isNull();
        assertThat(user.getDisplayName()).isEqualTo("탈퇴한 사용자");
        assertThat(user.getWithdrawnAt()).isNotNull();
        assertThat(member.getStatus()).isEqualTo(MembershipStatus.SUSPENDED);
        assertThat(invitation.getRecipientEmailCanonical())
                .isEqualTo("withdrawn-user-2@invalid.local");
        assertThat(invitation.getStatus().name()).isEqualTo("REVOKED");
        verify(emailVerificationTokenRepository).deleteAllByUserId(2L);
        verify(passwordResetTokenRepository).deleteAllByUserId(2L);
        verify(mfaRecoveryCodeRepository).deleteAllByUserId(2L);
        verify(securityAuditService)
                .recordPlatformTargetAction("ACCOUNT_WITHDRAWN", 2L, "APP_USER", 2L);
    }
}
