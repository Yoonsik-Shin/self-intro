package com.selfintro.modules.identity.application;

import java.time.LocalDateTime;
import java.util.Set;

/** Provider-neutral boundary for Workspace-owned rows in the primary relational store. */
public interface WorkspaceRelationalStoragePort {

    WorkspaceRelationalInventory inspect(Long workspaceId, LocalDateTime now);

    WorkspaceRelationalPurgeResult purge(Long workspaceId, LocalDateTime now);

    record WorkspaceRelationalInventory(
            long cascadeRowCount,
            long invitationRowCount,
            long auditRowCount,
            long purgeControlRowCount,
            boolean workspaceExists,
            boolean closedWorkspace,
            boolean graceElapsed,
            Set<String> unknownWorkspaceTables,
            Set<String> missingWorkspaceTables,
            Set<String> foreignKeyDrift) {

        public boolean schemaVerified() {
            return unknownWorkspaceTables.isEmpty()
                    && missingWorkspaceTables.isEmpty()
                    && foreignKeyDrift.isEmpty();
        }

        public long totalRowsRequiringHandling() {
            return cascadeRowCount + invitationRowCount + auditRowCount;
        }
    }

    record WorkspaceRelationalPurgeResult(
            long deletedInvitationRows,
            long pseudonymizedAuditRows,
            long deletedWorkspaceRows,
            long retainedPurgeControlRows) {}
}
