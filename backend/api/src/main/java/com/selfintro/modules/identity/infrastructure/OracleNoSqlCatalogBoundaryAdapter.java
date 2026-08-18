package com.selfintro.modules.identity.infrastructure;

import com.selfintro.modules.identity.application.WorkspaceNoSqlStoragePort;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import oracle.nosql.driver.NoSQLHandle;
import oracle.nosql.driver.TableNotFoundException;
import oracle.nosql.driver.ops.GetTableRequest;
import oracle.nosql.driver.ops.QueryRequest;
import oracle.nosql.driver.ops.QueryResult;
import oracle.nosql.driver.ops.TableResult;
import oracle.nosql.driver.values.FieldValue;
import oracle.nosql.driver.values.MapValue;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OracleNoSqlCatalogBoundaryAdapter implements WorkspaceNoSqlStoragePort {

    static final String LEGACY_TABLE = "JobPostingReadModel";
    private static final Pattern SAFE_TABLE_NAME = Pattern.compile("[A-Za-z][A-Za-z0-9_]{0,127}");
    private static final Pattern SCHEMA_FIELD_NAME =
            Pattern.compile("\\\"name\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"");
    private static final Set<String> EXPECTED_CATALOG_FIELDS =
            Set.of("jobpostingid", "companyname", "title", "status", "applyurl", "updatedat");
    private static final Set<String> FORBIDDEN_OWNERSHIP_FIELDS =
            Set.of(
                    "workspaceid",
                    "workspace_id",
                    "userid",
                    "user_id",
                    "email",
                    "matchscore",
                    "matchsummary");

    private final ObjectProvider<NoSQLHandle> handleProvider;
    private final String catalogTable;

    public OracleNoSqlCatalogBoundaryAdapter(
            ObjectProvider<NoSQLHandle> handleProvider,
            @Value("${oracle.nosql.table-name:JobPostingCatalogReadModel}") String catalogTable) {
        this.handleProvider = handleProvider;
        this.catalogTable = validateTableName(catalogTable);
    }

    @Override
    public NoSqlCatalogInventory inspectCatalogBoundary() {
        NoSQLHandle handle = requiredHandle();
        TableResult catalog =
                handle.getTable(new GetTableRequest().setTableName(catalogTable).setTimeout(5_000));
        boolean schemaVerified = isCatalogOnlySchema(catalog.getSchema());
        long catalogRows = countRows(handle, catalogTable);
        long legacyRows =
                catalogTable.equalsIgnoreCase(LEGACY_TABLE)
                        ? schemaVerified ? 0 : catalogRows
                        : countRowsIfPresent(handle, LEGACY_TABLE);
        return new NoSqlCatalogInventory(catalogTable, catalogRows, schemaVerified, legacyRows);
    }

    static boolean isCatalogOnlySchema(String schema) {
        if (schema == null || schema.isBlank()) {
            return false;
        }
        int fieldsStart = schema.indexOf("\"fields\"");
        int fieldsEnd = schema.indexOf("\"primaryKey\"", fieldsStart);
        if (fieldsStart < 0 || fieldsEnd < 0) {
            return false;
        }
        Matcher matcher = SCHEMA_FIELD_NAME.matcher(schema.substring(fieldsStart, fieldsEnd));
        Set<String> actualFields = new LinkedHashSet<>();
        while (matcher.find()) {
            actualFields.add(matcher.group(1).toLowerCase(Locale.ROOT));
        }
        boolean hasForbidden = FORBIDDEN_OWNERSHIP_FIELDS.stream().anyMatch(actualFields::contains);
        return !hasForbidden && actualFields.equals(EXPECTED_CATALOG_FIELDS);
    }

    private long countRowsIfPresent(NoSQLHandle handle, String tableName) {
        try {
            handle.getTable(new GetTableRequest().setTableName(tableName).setTimeout(5_000));
            return countRows(handle, tableName);
        } catch (TableNotFoundException ignored) {
            return 0;
        }
    }

    private long countRows(NoSQLHandle handle, String tableName) {
        QueryRequest request =
                new QueryRequest()
                        .setStatement("SELECT count(*) AS rowCount FROM " + tableName)
                        .setTimeout(5_000);
        long count = 0;
        do {
            QueryResult result = handle.query(request);
            for (MapValue row : result.getResults()) {
                FieldValue value = row.get("rowCount");
                if (value == null) {
                    value = row.get("ROWCOUNT");
                }
                if (value != null) {
                    count += value.asLong().getValue();
                }
            }
        } while (!request.isDone());
        return count;
    }

    private NoSQLHandle requiredHandle() {
        NoSQLHandle handle = handleProvider.getIfAvailable();
        if (handle == null) {
            throw new IllegalStateException("Oracle NoSQL handle이 준비되지 않았습니다.");
        }
        return handle;
    }

    private static String validateTableName(String tableName) {
        if (tableName == null || !SAFE_TABLE_NAME.matcher(tableName).matches()) {
            throw new IllegalArgumentException("Oracle NoSQL table 이름이 올바르지 않습니다.");
        }
        return tableName;
    }
}
