package com.selfintro.modules.identity.application;

import com.selfintro.modules.auth.application.AppUserPrincipal;
import com.selfintro.modules.identity.domain.MembershipStatus;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceMemberRepository;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.identity.domain.WorkspaceStatus;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import java.util.EnumSet;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class WorkspaceAccessPolicy {

    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceSlugService workspaceSlugService;
    private final SecurityAuditService securityAuditService;

    @Transactional
    public WorkspaceMember requireAnyRole(
            Authentication authentication,
            String workspaceSlug,
            WorkspaceRole first,
            WorkspaceRole... additional) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof AppUserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        var workspace =
                workspaceSlugService
                        .resolveActive(workspaceSlug)
                        .filter(candidate -> candidate.getStatus() == WorkspaceStatus.ACTIVE)
                        .orElseGet(
                                () -> {
                                    deny(principal.userId(), null, "WORKSPACE_NOT_FOUND");
                                    return null;
                                });
        return requireAnyRole(principal.userId(), workspace.getId(), first, additional);
    }

    @Transactional
    public WorkspaceMember requireAnyRole(
            Long userId, Long workspaceId, WorkspaceRole first, WorkspaceRole... additional) {
        EnumSet<WorkspaceRole> allowed = EnumSet.of(first, additional);
        WorkspaceMember membership =
                workspaceMemberRepository
                        .findByWorkspaceIdAndUserIdAndStatus(
                                workspaceId, userId, MembershipStatus.ACTIVE)
                        .orElseGet(
                                () -> {
                                    deny(userId, workspaceId, "MEMBERSHIP_NOT_FOUND");
                                    return null;
                                });
        if (!allowed.contains(membership.getRole())) {
            deny(userId, workspaceId, "INSUFFICIENT_WORKSPACE_ROLE");
        }
        return membership;
    }

    private void deny(Long userId, Long workspaceId, String reasonCode) {
        securityAuditService.recordAuthorizationDenied(userId, workspaceId, reasonCode);
        // 다른 Workspace의 존재 여부를 노출하지 않는다.
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "리소스를 찾을 수 없습니다.");
    }
}
