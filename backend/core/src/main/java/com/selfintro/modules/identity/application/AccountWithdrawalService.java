package com.selfintro.modules.identity.application;

import com.selfintro.modules.auth.domain.MfaRecoveryCodeRepository;
import com.selfintro.modules.identity.domain.AppUser;
import com.selfintro.modules.identity.domain.AppUserRepository;
import com.selfintro.modules.identity.domain.EmailVerificationTokenRepository;
import com.selfintro.modules.identity.domain.MembershipStatus;
import com.selfintro.modules.identity.domain.UserPlatformRoleRepository;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceMemberRepository;
import com.selfintro.modules.identity.domain.WorkspaceMembershipInvitationRepository;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.identity.domain.WorkspaceStatus;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AccountWithdrawalService {

    public static final String CONFIRMATION_PHRASE = "계정 탈퇴";

    private final AppUserRepository appUserRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceMembershipInvitationRepository invitationRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final MfaRecoveryCodeRepository mfaRecoveryCodeRepository;
    private final UserPlatformRoleRepository userPlatformRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityAuditService securityAuditService;

    @Transactional(readOnly = true)
    public WithdrawalReadiness readiness(Long userId) {
        AppUser user = requireActiveUser(userId);
        List<WorkspaceMember> activeMemberships =
                workspaceMemberRepository.findAllByUserIdAndStatus(
                        user.getId(), MembershipStatus.ACTIVE);
        return toReadiness(user.getId(), activeMemberships);
    }

    @Transactional
    public void withdraw(Long userId, String confirmation) {
        if (!CONFIRMATION_PHRASE.equals(confirmation)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "탈퇴 확인 문구가 일치하지 않습니다.");
        }

        AppUser user =
                appUserRepository
                        .findByIdForUpdate(userId)
                        .filter(AppUser::isActive)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "활성 계정을 찾을 수 없습니다."));
        List<WorkspaceMember> activeMemberships =
                workspaceMemberRepository.findAllByUserIdAndStatusForUpdate(
                        userId, MembershipStatus.ACTIVE);
        WithdrawalReadiness readiness = toReadiness(userId, activeMemberships);
        if (!readiness.eligible()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "소유권 또는 플랫폼 역할을 먼저 정리해야 합니다.");
        }

        activeMemberships.forEach(WorkspaceMember::suspend);
        LocalDateTime now = LocalDateTime.now();
        if (user.getEmailCanonical() != null) {
            String anonymizedRecipient = "withdrawn-user-" + userId + "@invalid.local";
            invitationRepository.findAllByRecipientEmailCanonical(user.getEmailCanonical()).stream()
                    .forEach(invitation -> invitation.redactRecipient(anonymizedRecipient, now));
        }
        emailVerificationTokenRepository.deleteAllByUserId(userId);
        mfaRecoveryCodeRepository.deleteAllByUserId(userId);

        String anonymizedLoginId =
                "withdrawn-"
                        + userId
                        + "-"
                        + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        user.withdraw(anonymizedLoginId, passwordEncoder.encode(UUID.randomUUID().toString()), now);
        securityAuditService.recordPlatformTargetAction(
                "ACCOUNT_WITHDRAWN", userId, "APP_USER", userId);
    }

    private AppUser requireActiveUser(Long userId) {
        return appUserRepository
                .findById(userId)
                .filter(AppUser::isActive)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND, "활성 계정을 찾을 수 없습니다."));
    }

    private WithdrawalReadiness toReadiness(Long userId, List<WorkspaceMember> activeMemberships) {
        List<OwnedWorkspaceBlocker> ownedWorkspaceBlockers =
                activeMemberships.stream()
                        .filter(member -> member.getRole() == WorkspaceRole.OWNER)
                        .filter(
                                member ->
                                        member.getWorkspace().getStatus() == WorkspaceStatus.ACTIVE)
                        .map(
                                member ->
                                        new OwnedWorkspaceBlocker(
                                                member.getWorkspace().getId(),
                                                member.getWorkspace().getSlug(),
                                                member.getWorkspace().getName()))
                        .toList();
        List<String> platformRoleBlockers =
                userPlatformRoleRepository.findAllByUserId(userId).stream()
                        .map(platformRole -> platformRole.getRole().name())
                        .sorted()
                        .toList();
        return new WithdrawalReadiness(
                ownedWorkspaceBlockers.isEmpty() && platformRoleBlockers.isEmpty(),
                activeMemberships.size(),
                ownedWorkspaceBlockers,
                platformRoleBlockers,
                CONFIRMATION_PHRASE);
    }

    public record OwnedWorkspaceBlocker(Long workspaceId, String slug, String name) {}

    public record WithdrawalReadiness(
            boolean eligible,
            int activeMembershipCount,
            List<OwnedWorkspaceBlocker> ownedWorkspaceBlockers,
            List<String> platformRoleBlockers,
            String confirmationPhrase) {}
}
