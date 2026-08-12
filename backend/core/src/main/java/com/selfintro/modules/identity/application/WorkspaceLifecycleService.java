package com.selfintro.modules.identity.application;

import com.selfintro.modules.identity.domain.MembershipStatus;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceMemberRepository;
import com.selfintro.modules.identity.domain.WorkspaceMembershipInvitationRepository;
import com.selfintro.modules.identity.domain.WorkspaceRepository;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.identity.domain.WorkspaceStatus;
import java.time.Duration;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class WorkspaceLifecycleService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final WorkspaceMembershipInvitationRepository invitationRepository;
    private final WorkspacePurgeService purgeService;

    @Value("${app.workspace-lifecycle.deletion-grace-period:30d}")
    private Duration deletionGracePeriod;

    @Transactional
    public WorkspaceView rename(WorkspaceMember actor, String rawName) {
        Workspace workspace = lock(actor.getWorkspace().getId());
        WorkspaceMember lockedActor = activeMember(workspace.getId(), actor.getUser().getId());
        if (lockedActor.getRole() != WorkspaceRole.OWNER
                && lockedActor.getRole() != WorkspaceRole.ADMIN) {
            throw notFound();
        }
        String name = validateName(rawName);
        workspace.rename(name);
        return WorkspaceView.from(workspace);
    }

    @Transactional
    public LeaveView leave(WorkspaceMember actor) {
        Workspace workspace = lock(actor.getWorkspace().getId());
        WorkspaceMember lockedActor = activeMember(workspace.getId(), actor.getUser().getId());
        if (lockedActor.getRole() == WorkspaceRole.OWNER) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "OWNER는 소유권을 이전하거나 Workspace를 폐쇄한 뒤 탈퇴할 수 있습니다.");
        }
        lockedActor.suspend();
        return new LeaveView(workspace.getId(), lockedActor.getId());
    }

    @Transactional
    public ClosureView close(WorkspaceMember actor, String confirmationName) {
        Workspace workspace = lock(actor.getWorkspace().getId());
        WorkspaceMember lockedActor = activeMember(workspace.getId(), actor.getUser().getId());
        if (lockedActor.getRole() != WorkspaceRole.OWNER) throw notFound();
        if (confirmationName == null || !workspace.getName().equals(confirmationName.trim())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "확인을 위해 현재 Workspace 이름을 정확히 입력해 주세요.");
        }

        LocalDateTime now = LocalDateTime.now();
        workspace.close(lockedActor.getUser().getId(), now, now.plus(safeDeletionGracePeriod()));
        memberRepository
                .findAllByWorkspaceIdAndStatusOrderByJoinedAtAsc(
                        workspace.getId(), MembershipStatus.ACTIVE)
                .forEach(WorkspaceMember::suspend);
        invitationRepository.findAllByWorkspaceIdOrderByCreatedAtDesc(workspace.getId()).stream()
                .filter(invitation -> invitation.isUsable(now))
                .forEach(invitation -> invitation.revoke(now));
        purgeService.schedule(workspace, lockedActor.getUser().getId(), now);
        return new ClosureView(
                workspace.getId(), workspace.getDeletedAt(), workspace.getPurgeAfter());
    }

    private Workspace lock(Long workspaceId) {
        return workspaceRepository
                .findByIdForUpdate(workspaceId)
                .filter(workspace -> workspace.getStatus() == WorkspaceStatus.ACTIVE)
                .orElseThrow(this::notFound);
    }

    private WorkspaceMember activeMember(Long workspaceId, Long userId) {
        return memberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, MembershipStatus.ACTIVE)
                .orElseThrow(this::notFound);
    }

    private String validateName(String rawName) {
        if (rawName == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workspace 이름이 필요합니다.");
        }
        String name = rawName.trim();
        if (name.length() < 2 || name.length() > 120) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Workspace 이름은 2~120자여야 합니다.");
        }
        return name;
    }

    private Duration safeDeletionGracePeriod() {
        if (deletionGracePeriod.isNegative() || deletionGracePeriod.isZero()) {
            return Duration.ofDays(30);
        }
        return deletionGracePeriod;
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "리소스를 찾을 수 없습니다.");
    }

    public record WorkspaceView(Long workspaceId, String slug, String name) {
        static WorkspaceView from(Workspace workspace) {
            return new WorkspaceView(workspace.getId(), workspace.getSlug(), workspace.getName());
        }
    }

    public record LeaveView(Long workspaceId, Long memberId) {}

    public record ClosureView(
            Long workspaceId, LocalDateTime deletedAt, LocalDateTime purgeAfter) {}
}
