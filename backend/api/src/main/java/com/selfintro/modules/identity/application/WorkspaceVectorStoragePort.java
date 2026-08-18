package com.selfintro.modules.identity.application;

/**
 * Provider-neutral boundary for Workspace-owned vector data.
 *
 * <p>The shared job-posting vector catalog is intentionally absent from this contract because it is
 * not owned by a Workspace.
 */
public interface WorkspaceVectorStoragePort {

    WorkspaceVectorInventory inspect(Long workspaceId);

    WorkspaceVectorPurgeResult purge(Long workspaceId);

    record WorkspaceVectorInventory(long experienceVectorCount, long studyVectorCount) {
        public long totalCandidateCount() {
            return experienceVectorCount + studyVectorCount;
        }
    }

    record WorkspaceVectorPurgeResult(
            long deletedExperienceVectorCount, long deletedStudyVectorCount) {
        public long totalDeletedCount() {
            return deletedExperienceVectorCount + deletedStudyVectorCount;
        }
    }
}
