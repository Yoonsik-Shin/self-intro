package com.selfintro.global.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker = true)
class FlywayMySqlMigrationIntegrationTest {

    @Container
    private static final MySQLContainer<?> MYSQL =
            new MySQLContainer<>("mysql:8.0")
                    .withDatabaseName("self_intro_migration_test")
                    .withUsername("self_intro")
                    .withPassword("self_intro");

    @Test
    void appliesAllMigrationsToEmptyMySqlDatabase() throws Exception {
        Flyway flyway =
                Flyway.configure()
                        .dataSource(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword())
                        .locations("classpath:db/migration")
                        .placeholderReplacement(false)
                        .outOfOrder(false)
                        .load();

        assertThat(flyway.migrate().success).isTrue();
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("10");

        try (Connection connection = MYSQL.createConnection("");
                Statement statement = connection.createStatement();
                ResultSet resultSet =
                        statement.executeQuery(
                                "SELECT COUNT(*) FROM flyway_schema_history WHERE success = 1")) {
            assertThat(resultSet.next()).isTrue();
            assertThat(resultSet.getInt(1)).isEqualTo(10);
        }
    }
}
