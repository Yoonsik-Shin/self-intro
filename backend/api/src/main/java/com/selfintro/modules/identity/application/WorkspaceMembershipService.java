package com.selfintro.modules.identity.application;

import com.selfintro.modules.billing.application.WorkspaceOwnershipBillingGuard;
import com.selfintro.modules.billing.application.WorkspacePlanEntitlementService;
import com.selfintro.modules.identity.domain.*;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class WorkspaceMembershipService {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final WorkspaceMembershipInvitationRepository invitationRepository;
    private final AppUserRepository userRepository;
    private final RegistrationSecretHasher secretHasher;
    private final WorkspaceMembershipInvitationEmailSender emailSender;
    private final WorkspacePlanEntitlementService planEntitlementService;
    private final WorkspaceOwnershipBillingGuard ownershipBillingGuard;

    @Value(
            "${app.workspace-invitation.accept-base-url:http://localhost:3000/workspace-invitations}")
    private String acceptBaseUrl;

    @Transactional(readOnly = true)
    public ManagementView management(Long workspaceId) {
        LocalDateTime now = LocalDateTime.now();
        List<MemberView> members =
                memberRepository
                        .findAllByWorkspaceIdAndStatusOrderByJoinedAtAsc(
                                workspaceId, MembershipStatus.ACTIVE)
                        .stream()
                        .map(MemberView::from)
                        .toList();
        List<InvitationView> invitations =
                invitationRepository.findAllByWorkspaceIdOrderByCreatedAtDesc(workspaceId).stream()
                        .map(invitation -> InvitationView.from(invitation, now))
                        .toList();
        return new ManagementView(members, invitations);
    }

    @Transactional
    public InvitationView invite(
            WorkspaceMember actor, String rawEmail, WorkspaceRole role, int validForHours) {
        Workspace workspace = lock(actor.getWorkspace().getId());
        WorkspaceMember lockedActor = activeMember(workspace.getId(), actor.getUser().getId());
        requireCanInvite(lockedActor.getRole(), role);
        if (validForHours < 1 || validForHours > 168) {
            throw badRequest("초대 유효기간은 1시간~7일이어야 합니다.");
        }
        planEntitlementService.requireInvitationCapacity(workspace.getId(), LocalDateTime.now());
        String email = canonicalEmail(rawEmail);
        AppUser recipient =
                userRepository
                        .findByEmailCanonical(email)
                        .filter(AppUser::isActive)
                        .orElseThrow(() -> badRequest("초대 가능한 활성 계정을 찾을 수 없습니다."));
        memberRepository
                .findByWorkspaceIdAndUserIdAndStatus(
                        workspace.getId(), recipient.getId(), MembershipStatus.ACTIVE)
                .ifPresent(
                        existing -> {
                            throw conflict("이미 Workspace에 참여 중인 계정입니다.");
                        });

        LocalDateTime now = LocalDateTime.now();
        invitationRepository
                .findAllByWorkspaceIdAndRecipientEmailCanonicalAndStatus(
                        workspace.getId(), email, WorkspaceMembershipInvitationStatus.PENDING)
                .stream()
                .filter(existing -> existing.isUsable(now))
                .forEach(existing -> existing.revoke(now));

        String rawToken = newRawToken();
        LocalDateTime expiresAt = now.plusHours(validForHours);
        WorkspaceMembershipInvitation invitation =
                invitationRepository.saveAndFlush(
                        WorkspaceMembershipInvitation.issue(
                                workspace.getId(),
                                lockedActor.getUser().getId(),
                                email,
                                role,
                                secretHasher.hash(rawToken),
                                expiresAt));
        emailSender.send(
                email,
                workspace.getName(),
                lockedActor.getUser().getDisplayName(),
                invitationUrl(rawToken),
                expiresAt);
        return InvitationView.from(invitation, now);
    }

    @Transactional
    public InvitationView revoke(WorkspaceMember actor, Long invitationId) {
        Workspace workspace = lock(actor.getWorkspace().getId());
        WorkspaceMember lockedActor = activeMember(workspace.getId(), actor.getUser().getId());
        WorkspaceMembershipInvitation invitation =
                invitationRepository
                        .findByIdAndWorkspaceId(invitationId, workspace.getId())
                        .orElseThrow(() -> notFound());
        requireCanInvite(lockedActor.getRole(), invitation.getRole());
        LocalDateTime now = LocalDateTime.now();
        if (!invitation.isUsable(now)) {
            throw conflict("이미 사용·만료·취소된 Workspace 초대입니다.");
        }
        invitation.revoke(now);
        return InvitationView.from(invitation, now);
    }

    @Transactional
    public AcceptedMembershipView accept(Long userId, String rawToken) {
        AppUser user =
                userRepository
                        .findById(userId)
                        .filter(AppUser::isActive)
                        .orElseThrow(() -> notFound());
        byte[] tokenHash = secretHasher.hash(rawToken);
        Long workspaceId =
                invitationRepository
                        .findWorkspaceIdByTokenHash(tokenHash)
                        .orElseThrow(() -> notFound());
        Workspace workspace = lock(workspaceId);
        WorkspaceMembershipInvitation invitation = lockedInvitation(tokenHash);
        LocalDateTime now = LocalDateTime.now();
        if (!invitation.isUsable(now)
                || user.getEmailCanonical() == null
                || !invitation.getRecipientEmailCanonical().equals(user.getEmailCanonical())) {
            throw notFound();
        }
        planEntitlementService.requireAcceptanceCapacity(workspace.getId(), now);
        WorkspaceMember membership;
        var existingMembership =
                memberRepository.findByWorkspaceIdAndUserId(workspace.getId(), user.getId());
        if (existingMembership.isPresent()) {
            membership = existingMembership.get();
            if (membership.getStatus() == MembershipStatus.ACTIVE) {
                throw conflict("이미 Workspace에 참여 중입니다.");
            }
            membership.activate(invitation.getRole());
        } else {
            membership =
                    memberRepository.save(
                            WorkspaceMember.active(workspace, user, invitation.getRole()));
        }
        invitation.accept(now);
        return new AcceptedMembershipView(
                workspace.getId(), workspace.getSlug(), MemberView.from(membership));
    }

    @Transactional
    public DeclinedInvitationView decline(Long userId, String rawToken) {
        AppUser user =
                userRepository
                        .findById(userId)
                        .filter(AppUser::isActive)
                        .orElseThrow(this::notFound);
        byte[] tokenHash = secretHasher.hash(rawToken);
        Long workspaceId =
                invitationRepository
                        .findWorkspaceIdByTokenHash(tokenHash)
                        .orElseThrow(this::notFound);
        Workspace workspace = lock(workspaceId);
        WorkspaceMembershipInvitation invitation = lockedInvitation(tokenHash);
        LocalDateTime now = LocalDateTime.now();
        if (!invitation.isUsable(now)
                || user.getEmailCanonical() == null
                || !invitation.getRecipientEmailCanonical().equals(user.getEmailCanonical())) {
            throw notFound();
        }
        invitation.decline(now);
        return new DeclinedInvitationView(workspace.getId(), invitation.getId());
    }

    @Transactional
    public MemberView changeRole(
            WorkspaceMember actor, Long targetMemberId, WorkspaceRole requestedRole) {
        Workspace workspace = lock(actor.getWorkspace().getId());
        WorkspaceMember lockedActor = activeMember(workspace.getId(), actor.getUser().getId());
        WorkspaceMember target = targetMember(workspace.getId(), targetMemberId);
        if (requestedRole == WorkspaceRole.OWNER || target.getRole() == WorkspaceRole.OWNER) {
            throw badRequest("OWNER 변경은 소유권 이전 기능을 사용해 주세요.");
        }
        if (lockedActor.getId().equals(target.getId())) {
            throw badRequest("자신의 역할은 직접 변경할 수 없습니다.");
        }
        requireCanManage(lockedActor.getRole(), target.getRole(), requestedRole);
        target.changeRole(requestedRole);
        return MemberView.from(target);
    }

    @Transactional
    public void remove(WorkspaceMember actor, Long targetMemberId) {
        Workspace workspace = lock(actor.getWorkspace().getId());
        WorkspaceMember lockedActor = activeMember(workspace.getId(), actor.getUser().getId());
        WorkspaceMember target = targetMember(workspace.getId(), targetMemberId);
        if (lockedActor.getId().equals(target.getId())) {
            throw badRequest("자신을 제거하려면 별도의 Workspace 탈퇴 절차가 필요합니다.");
        }
        if (target.getRole() == WorkspaceRole.OWNER) {
            throw badRequest("OWNER는 제거할 수 없습니다. 먼저 소유권을 이전해 주세요.");
        }
        requireCanManage(lockedActor.getRole(), target.getRole(), target.getRole());
        target.suspend();
    }

    @Transactional
    public OwnershipTransferView transferOwnership(WorkspaceMember actor, Long targetMemberId) {
        Workspace workspace = lock(actor.getWorkspace().getId());
        WorkspaceMember lockedActor = activeMember(workspace.getId(), actor.getUser().getId());
        WorkspaceMember target = targetMember(workspace.getId(), targetMemberId);
        if (lockedActor.getRole() != WorkspaceRole.OWNER) throw notFound();
        if (lockedActor.getId().equals(target.getId())) {
            throw badRequest("현재 OWNER에게 소유권을 이전할 수 없습니다.");
        }
        if (memberRepository.countByWorkspaceIdAndStatusAndRole(
                        workspace.getId(), MembershipStatus.ACTIVE, WorkspaceRole.OWNER)
                != 1) {
            throw conflict("Workspace OWNER 상태를 확인할 수 없습니다.");
        }
        ownershipBillingGuard.suspendAutomaticSecrets(workspace.getId());
        lockedActor.changeRole(WorkspaceRole.ADMIN);
        memberRepository.flush();
        target.changeRole(WorkspaceRole.OWNER);
        memberRepository.flush();
        return new OwnershipTransferView(MemberView.from(lockedActor), MemberView.from(target));
    }

    private Workspace lock(Long workspaceId) {
        return workspaceRepository
                .findByIdForUpdate(workspaceId)
                .filter(workspace -> workspace.getStatus() == WorkspaceStatus.ACTIVE)
                .orElseThrow(this::notFound);
    }

    private WorkspaceMembershipInvitation lockedInvitation(byte[] tokenHash) {
        return invitationRepository.findByTokenHashForUpdate(tokenHash).orElseThrow(this::notFound);
    }

    private WorkspaceMember activeMember(Long workspaceId, Long userId) {
        return memberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, MembershipStatus.ACTIVE)
                .orElseThrow(this::notFound);
    }

    private WorkspaceMember targetMember(Long workspaceId, Long memberId) {
        return memberRepository
                .findByIdAndWorkspaceId(memberId, workspaceId)
                .filter(member -> member.getStatus() == MembershipStatus.ACTIVE)
                .orElseThrow(this::notFound);
    }

    private void requireCanInvite(WorkspaceRole actorRole, WorkspaceRole invitedRole) {
        if (invitedRole == WorkspaceRole.OWNER
                || (actorRole == WorkspaceRole.ADMIN && invitedRole == WorkspaceRole.ADMIN)
                || (actorRole != WorkspaceRole.OWNER && actorRole != WorkspaceRole.ADMIN)) {
            throw notFound();
        }
    }

    private void requireCanManage(
            WorkspaceRole actorRole, WorkspaceRole targetRole, WorkspaceRole requestedRole) {
        if (actorRole == WorkspaceRole.OWNER) return;
        if (actorRole == WorkspaceRole.ADMIN
                && targetRole != WorkspaceRole.ADMIN
                && targetRole != WorkspaceRole.OWNER
                && requestedRole != WorkspaceRole.ADMIN
                && requestedRole != WorkspaceRole.OWNER) return;
        throw notFound();
    }

    private String canonicalEmail(String rawEmail) {
        if (rawEmail == null || rawEmail.isBlank()) throw badRequest("이메일이 필요합니다.");
        String email = rawEmail.trim().toLowerCase(Locale.ROOT);
        if (email.length() > 255 || !email.contains("@")) throw badRequest("유효한 이메일이 필요합니다.");
        return email;
    }

    private String newRawToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return "wsi_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String invitationUrl(String rawToken) {
        return acceptBaseUrl + "#invite=" + rawToken;
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "리소스를 찾을 수 없습니다.");
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    public record ManagementView(List<MemberView> members, List<InvitationView> invitations) {}

    public record MemberView(
            Long id,
            String displayName,
            String emailMasked,
            WorkspaceRole role,
            LocalDateTime joinedAt) {
        static MemberView from(WorkspaceMember member) {
            return new MemberView(
                    member.getId(),
                    member.getUser().getDisplayName(),
                    maskEmail(member.getUser().getEmailCanonical()),
                    member.getRole(),
                    member.getJoinedAt());
        }
    }

    public record InvitationView(
            Long id,
            String recipientEmailMasked,
            WorkspaceRole role,
            String status,
            LocalDateTime expiresAt,
            LocalDateTime createdAt) {
        static InvitationView from(WorkspaceMembershipInvitation invitation, LocalDateTime now) {
            return new InvitationView(
                    invitation.getId(),
                    maskEmail(invitation.getRecipientEmailCanonical()),
                    invitation.getRole(),
                    invitation.effectiveStatus(now),
                    invitation.getExpiresAt(),
                    invitation.getCreatedAt());
        }
    }

    public record OwnershipTransferView(MemberView previousOwner, MemberView newOwner) {}

    public record AcceptedMembershipView(
            Long workspaceId, String workspaceSlug, MemberView member) {}

    public record DeclinedInvitationView(Long workspaceId, Long invitationId) {}

    private static String maskEmail(String email) {
        if (email == null) return null;
        int at = email.indexOf('@');
        if (at <= 0) return "***";
        return email.substring(0, 1) + "***" + email.substring(at);
    }
}
