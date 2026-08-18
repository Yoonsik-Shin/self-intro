package com.selfintro.global.web;

import com.selfintro.modules.identity.domain.WorkspaceRole;

public enum WorkspaceAccessLevel {
    READ(
            new WorkspaceRole[] {
                WorkspaceRole.OWNER,
                WorkspaceRole.ADMIN,
                WorkspaceRole.EDITOR,
                WorkspaceRole.VIEWER
            }),
    WRITE(new WorkspaceRole[] {WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.EDITOR}),
    ADMIN(new WorkspaceRole[] {WorkspaceRole.OWNER, WorkspaceRole.ADMIN}),
    OWNER(new WorkspaceRole[] {WorkspaceRole.OWNER});

    private final WorkspaceRole[] roles;

    WorkspaceAccessLevel(WorkspaceRole[] roles) {
        this.roles = roles;
    }

    public WorkspaceRole first() {
        return roles[0];
    }

    public WorkspaceRole[] additional() {
        if (roles.length <= 1) {
            return new WorkspaceRole[0];
        }
        WorkspaceRole[] copy = new WorkspaceRole[roles.length - 1];
        System.arraycopy(roles, 1, copy, 0, roles.length - 1);
        return copy;
    }
}
