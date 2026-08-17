package com.selfintro.vectorsearch.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.StreamUtils;

class OracleVectorSchemaInitializerTest {

    private final OracleVectorSchemaInitializer initializer =
            new OracleVectorSchemaInitializer(null, true);

    @Test
    void splitsRealSchemaFileIntoExecutableStatements() throws Exception {
        String script =
                StreamUtils.copyToString(
                        new ClassPathResource("oracle-schema.sql").getInputStream(),
                        StandardCharsets.UTF_8);

        var statements = initializer.splitStatements(script);

        assertThat(statements).hasSize(9);
        assertThat(statements.get(0)).startsWith("CREATE TABLE IF NOT EXISTS job_posting_vector");
        assertThat(statements)
                .filteredOn(sql -> sql.contains("EXECUTE IMMEDIATE"))
                .hasSize(2)
                .allSatisfy(
                        sql -> {
                            assertThat(sql).startsWith("DECLARE");
                            assertThat(sql).doesNotContain("\n/");
                        });
    }

    @Test
    void ignoresBlankInput() {
        assertThat(initializer.splitStatements("")).isEmpty();
        assertThat(initializer.splitStatements("\n\n  \n")).isEmpty();
    }
}
