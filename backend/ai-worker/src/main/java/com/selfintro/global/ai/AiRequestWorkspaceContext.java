package com.selfintro.global.ai;

import java.util.Optional;

public final class AiRequestWorkspaceContext {

    private static final ThreadLocal<Long> WORKSPACE_ID = new ThreadLocal<>();

    private AiRequestWorkspaceContext() {}

    public static void set(Long workspaceId) {
        WORKSPACE_ID.set(workspaceId);
    }

    public static Optional<Long> workspaceId() {
        return Optional.ofNullable(WORKSPACE_ID.get());
    }

    public static void clear() {
        WORKSPACE_ID.remove();
    }
}
