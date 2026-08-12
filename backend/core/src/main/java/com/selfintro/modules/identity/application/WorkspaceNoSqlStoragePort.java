package com.selfintro.modules.identity.application;

/**
 * Provider-neutral boundary that proves the Oracle NoSQL read model is shared catalog data.
 *
 * <p>No delete operation is exposed because a verified catalog has no Workspace-owned rows. A
 * legacy table that may contain personalized matching fields is reported separately and keeps the
 * Workspace purge fail-closed until it is empty.
 */
public interface WorkspaceNoSqlStoragePort {

    NoSqlCatalogInventory inspectCatalogBoundary();

    record NoSqlCatalogInventory(
            String catalogTable,
            long catalogRowCount,
            boolean catalogSchemaVerified,
            long legacyPersonalizedRowCount) {

        public boolean isSafeToExcludeFromWorkspacePurge() {
            return catalogSchemaVerified && legacyPersonalizedRowCount == 0;
        }
    }
}
