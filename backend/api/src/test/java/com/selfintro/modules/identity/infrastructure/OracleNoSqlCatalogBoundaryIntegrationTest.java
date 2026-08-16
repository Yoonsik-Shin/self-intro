package com.selfintro.modules.identity.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.selfintro.modules.identity.application.WorkspaceNoSqlStoragePort;
import oracle.nosql.driver.NoSQLHandle;
import oracle.nosql.driver.NoSQLHandleConfig;
import oracle.nosql.driver.NoSQLHandleFactory;
import oracle.nosql.driver.kv.StoreAccessTokenProvider;
import oracle.nosql.driver.ops.GetTableRequest;
import oracle.nosql.driver.ops.TableRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;

@EnabledIfEnvironmentVariable(named = "RUN_ORACLE_NOSQL_INTEGRATION_TESTS", matches = "true")
class OracleNoSqlCatalogBoundaryIntegrationTest {

    private static final String CATALOG_TABLE = "JobPostingCatalogReadModel";

    @Test
    void verifiesLocalCatalogAndEmptyLegacyBoundary() {
        NoSQLHandleConfig config = new NoSQLHandleConfig("http://localhost:8090");
        config.setAuthorizationProvider(new StoreAccessTokenProvider());
        try (NoSQLHandle handle = NoSQLHandleFactory.createNoSQLHandle(config)) {
            handle.tableRequest(
                    new TableRequest()
                            .setStatement(
                                    "CREATE TABLE IF NOT EXISTS "
                                            + CATALOG_TABLE
                                            + " (jobPostingId LONG, companyName STRING, "
                                            + "title STRING, status STRING, applyUrl STRING, "
                                            + "updatedAt STRING, PRIMARY KEY(jobPostingId))"));

            DefaultListableBeanFactory beanFactory = new DefaultListableBeanFactory();
            beanFactory.registerSingleton("noSQLHandle", handle);
            OracleNoSqlCatalogBoundaryAdapter adapter =
                    new OracleNoSqlCatalogBoundaryAdapter(
                            beanFactory.getBeanProvider(NoSQLHandle.class), CATALOG_TABLE);

            WorkspaceNoSqlStoragePort.NoSqlCatalogInventory inventory =
                    adapter.inspectCatalogBoundary();

            assertThat(inventory.catalogTable()).isEqualTo(CATALOG_TABLE);
            String actualSchema =
                    handle.getTable(new GetTableRequest().setTableName(CATALOG_TABLE)).getSchema();
            assertThat(inventory.catalogSchemaVerified())
                    .withFailMessage("actual schema: %s", actualSchema)
                    .isTrue();
            assertThat(inventory.legacyPersonalizedRowCount()).isZero();
            assertThat(inventory.isSafeToExcludeFromWorkspacePurge()).isTrue();
        }
    }
}
