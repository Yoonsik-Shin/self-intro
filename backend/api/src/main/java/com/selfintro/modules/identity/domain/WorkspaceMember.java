package com.selfintro.modules.identity.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "workspace_member",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uk_workspace_member_workspace_user",
                        columnNames = {"workspace_id", "user_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspaceMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Enumerated(EnumType.STRING)
    @Column(name = "workspace_role", nullable = false, length = 20)
    private WorkspaceRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MembershipStatus status;

    @Column(name = "active_owner_workspace_id", unique = true)
    private Long activeOwnerWorkspaceId;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    public static WorkspaceMember owner(Workspace workspace, AppUser user) {
        WorkspaceMember member = new WorkspaceMember();
        member.workspace = workspace;
        member.user = user;
        member.role = WorkspaceRole.OWNER;
        member.status = MembershipStatus.ACTIVE;
        member.activeOwnerWorkspaceId = workspace.getId();
        member.joinedAt = LocalDateTime.now();
        return member;
    }

    public static WorkspaceMember active(Workspace workspace, AppUser user, WorkspaceRole role) {
        if (role == WorkspaceRole.OWNER) {
            throw new IllegalArgumentException("OWNER는 소유권 이전으로만 지정할 수 있습니다.");
        }
        WorkspaceMember member = new WorkspaceMember();
        member.workspace = workspace;
        member.user = user;
        member.role = role;
        member.status = MembershipStatus.ACTIVE;
        member.activeOwnerWorkspaceId = null;
        member.joinedAt = LocalDateTime.now();
        return member;
    }

    public void activate(WorkspaceRole role) {
        if (role == WorkspaceRole.OWNER) {
            throw new IllegalArgumentException("OWNER는 소유권 이전으로만 지정할 수 있습니다.");
        }
        this.role = role;
        this.status = MembershipStatus.ACTIVE;
        this.activeOwnerWorkspaceId = null;
        this.joinedAt = LocalDateTime.now();
    }

    public void changeRole(WorkspaceRole role) {
        this.role = role;
        this.activeOwnerWorkspaceId = role == WorkspaceRole.OWNER ? workspace.getId() : null;
    }

    public void suspend() {
        this.status = MembershipStatus.SUSPENDED;
        this.activeOwnerWorkspaceId = null;
    }
}
