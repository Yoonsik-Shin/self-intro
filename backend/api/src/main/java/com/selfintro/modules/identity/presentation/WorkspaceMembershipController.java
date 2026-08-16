package com.selfintro.modules.identity.presentation;

import com.selfintro.modules.auth.application.AppUserPrincipal;
import com.selfintro.modules.auth.application.RecentReauthenticationPolicy;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.application.WorkspaceMembershipService;
import com.selfintro.modules.identity.application.WorkspaceMembershipService.*;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.identity.presentation.dto.*;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
public class WorkspaceMembershipController {
    private final WorkspaceAccessPolicy workspaceAccessPolicy;
    private final WorkspaceMembershipService membershipService;
    private final RecentReauthenticationPolicy reauthenticationPolicy;
    private final SecurityAuditService securityAuditService;

    @GetMapping("/api/workspaces/{workspaceSlug}/members/manage")
    public ManagementView management(
            Authentication authentication, @PathVariable String workspaceSlug) {
        WorkspaceMember actor = manageMember(authentication, workspaceSlug);
        return membershipService.management(actor.getWorkspace().getId());
    }

    @PostMapping("/api/workspaces/{workspaceSlug}/members/manage/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public InvitationView invite(
            Authentication authentication,
            HttpSession session,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody WorkspaceMemberInviteRequest request) {
        WorkspaceMember actor = manageMember(authentication, workspaceSlug);
        reauthenticationPolicy.requireRecent(session);
        InvitationView invitation =
                membershipService.invite(
                        actor, request.email(), request.role(), request.validForHours());
        securityAuditService.recordWorkspaceTargetAction(
                "WORKSPACE_MEMBER_INVITED",
                actor.getUser().getId(),
                actor.getWorkspace().getId(),
                "WORKSPACE_MEMBERSHIP_INVITATION",
                invitation.id());
        return invitation;
    }

    @DeleteMapping("/api/workspaces/{workspaceSlug}/members/manage/invitations/{invitationId}")
    @Transactional
    public InvitationView revoke(
            Authentication authentication,
            HttpSession session,
            @PathVariable String workspaceSlug,
            @PathVariable Long invitationId) {
        WorkspaceMember actor = manageMember(authentication, workspaceSlug);
        reauthenticationPolicy.requireRecent(session);
        InvitationView invitation = membershipService.revoke(actor, invitationId);
        securityAuditService.recordWorkspaceTargetAction(
                "WORKSPACE_MEMBER_INVITATION_REVOKED",
                actor.getUser().getId(),
                actor.getWorkspace().getId(),
                "WORKSPACE_MEMBERSHIP_INVITATION",
                invitationId);
        return invitation;
    }

    @PutMapping("/api/workspaces/{workspaceSlug}/members/manage/{memberId}/role")
    @Transactional
    public MemberView changeRole(
            Authentication authentication,
            HttpSession session,
            @PathVariable String workspaceSlug,
            @PathVariable Long memberId,
            @Valid @RequestBody WorkspaceMemberRoleChangeRequest request) {
        WorkspaceMember actor = manageMember(authentication, workspaceSlug);
        reauthenticationPolicy.requireRecent(session);
        MemberView member = membershipService.changeRole(actor, memberId, request.role());
        securityAuditService.recordWorkspaceTargetAction(
                "WORKSPACE_MEMBER_ROLE_CHANGED",
                actor.getUser().getId(),
                actor.getWorkspace().getId(),
                "WORKSPACE_MEMBER",
                memberId);
        return member;
    }

    @DeleteMapping("/api/workspaces/{workspaceSlug}/members/manage/{memberId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void remove(
            Authentication authentication,
            HttpSession session,
            @PathVariable String workspaceSlug,
            @PathVariable Long memberId) {
        WorkspaceMember actor = manageMember(authentication, workspaceSlug);
        reauthenticationPolicy.requireRecent(session);
        membershipService.remove(actor, memberId);
        securityAuditService.recordWorkspaceTargetAction(
                "WORKSPACE_MEMBER_REMOVED",
                actor.getUser().getId(),
                actor.getWorkspace().getId(),
                "WORKSPACE_MEMBER",
                memberId);
    }

    @PostMapping("/api/workspaces/{workspaceSlug}/members/manage/{memberId}/transfer-ownership")
    @Transactional
    public OwnershipTransferView transferOwnership(
            Authentication authentication,
            HttpSession session,
            @PathVariable String workspaceSlug,
            @PathVariable Long memberId) {
        WorkspaceMember actor = manageMember(authentication, workspaceSlug);
        reauthenticationPolicy.requireRecent(session);
        OwnershipTransferView result = membershipService.transferOwnership(actor, memberId);
        securityAuditService.recordWorkspaceTargetAction(
                "WORKSPACE_OWNERSHIP_TRANSFERRED",
                actor.getUser().getId(),
                actor.getWorkspace().getId(),
                "WORKSPACE_MEMBER",
                memberId);
        return result;
    }

    @PostMapping("/api/workspace-membership-invitations/accept")
    @Transactional
    public WorkspaceInvitationAcceptedResponse accept(
            Authentication authentication,
            @Valid @RequestBody WorkspaceInvitationAcceptRequest request) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        AcceptedMembershipView accepted =
                membershipService.accept(principal.userId(), request.token());
        securityAuditService.recordWorkspaceTargetAction(
                "WORKSPACE_MEMBER_JOINED",
                principal.userId(),
                accepted.workspaceId(),
                "WORKSPACE_MEMBER",
                accepted.member().id());
        return new WorkspaceInvitationAcceptedResponse(accepted.workspaceSlug(), accepted.member());
    }

    @PostMapping("/api/workspace-membership-invitations/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void decline(
            Authentication authentication,
            @Valid @RequestBody WorkspaceInvitationAcceptRequest request) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        DeclinedInvitationView declined =
                membershipService.decline(principal.userId(), request.token());
        securityAuditService.recordWorkspaceTargetAction(
                "WORKSPACE_MEMBER_INVITATION_DECLINED",
                principal.userId(),
                declined.workspaceId(),
                "WORKSPACE_MEMBERSHIP_INVITATION",
                declined.invitationId());
    }

    private WorkspaceMember manageMember(Authentication authentication, String workspaceSlug) {
        return workspaceAccessPolicy.requireAnyRole(
                authentication, workspaceSlug, WorkspaceRole.OWNER, WorkspaceRole.ADMIN);
    }

    private AppUserPrincipal requirePrincipal(Authentication authentication) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof AppUserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return principal;
    }

    @ExceptionHandler(AuthenticationException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public void handleAuthenticationException() {}
}
