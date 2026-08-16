package com.selfintro.modules.identity.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class OracleNoSqlCatalogBoundaryAdapterTest {

    @Test
    void acceptsCatalogOnlySchema() {
        String schema =
                """
                {"fields":[
                  {"name":"jobPostingId"},{"name":"companyName"},{"name":"title"},
                  {"name":"status"},{"name":"applyUrl"},{"name":"updatedAt"}
                ],"primaryKey":["jobPostingId"]}
                """;

        assertThat(OracleNoSqlCatalogBoundaryAdapter.isCatalogOnlySchema(schema)).isTrue();
    }

    @Test
    void rejectsWorkspaceOrPersonalizedFields() {
        String workspaceSchema = schemaWithExtraField("workspaceId");
        String personalizedSchema = schemaWithExtraField("matchSummary");

        assertThat(OracleNoSqlCatalogBoundaryAdapter.isCatalogOnlySchema(workspaceSchema))
                .isFalse();
        assertThat(OracleNoSqlCatalogBoundaryAdapter.isCatalogOnlySchema(personalizedSchema))
                .isFalse();
    }

    @Test
    void rejectsIncompleteOrMissingSchema() {
        assertThat(OracleNoSqlCatalogBoundaryAdapter.isCatalogOnlySchema(null)).isFalse();
        assertThat(
                        OracleNoSqlCatalogBoundaryAdapter.isCatalogOnlySchema(
                                "{\"fields\":[{\"name\":\"jobPostingId\"}],"
                                        + "\"primaryKey\":[\"jobPostingId\"]}"))
                .isFalse();
    }

    private static String schemaWithExtraField(String extraField) {
        return """
                {"fields":[
                  {"name":"jobPostingId"},{"name":"companyName"},{"name":"title"},
                  {"name":"status"},{"name":"applyUrl"},{"name":"updatedAt"},
                  {"name":"%s"}
                ],"primaryKey":["jobPostingId"]}
                """
                .formatted(extraField);
    }
}
