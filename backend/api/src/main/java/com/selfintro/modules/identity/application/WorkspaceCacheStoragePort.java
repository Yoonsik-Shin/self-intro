package com.selfintro.modules.identity.application;

/** Provider-neutral boundary for Workspace-derived cache inventory and eviction. */
public interface WorkspaceCacheStoragePort {

    WorkspaceCacheInventory inspect(Long workspaceId);

    WorkspaceCachePurgeResult purge(Long workspaceId);

    record WorkspaceCacheInventory(
            long workspaceScopedKeyCount, long legacySharedNamespaceKeyCount) {
        public long totalCandidateCount() {
            return workspaceScopedKeyCount + legacySharedNamespaceKeyCount;
        }
    }

    record WorkspaceCachePurgeResult(long evictedKeyCount) {}
}
