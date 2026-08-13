package com.selfintro.modules.identity.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.selfintro.modules.identity.application.WorkspaceRelationalStoragePort;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;

@EnabledIfEnvironmentVariable(named = "RUN_MYSQL_PURGE_INTEGRATION_TESTS", matches = "true")
class MySqlWorkspaceRelationalStorageAdapterIntegrationTest {

    @Test
    void purgesIsolatedWorkspaceInVerifiedOrderAndRollsBackFixture() {
        DriverManagerDataSource dataSource =
                new DriverManagerDataSource(
                        "jdbc:mysql://localhost:3306/self_intro?serverTimezone=Asia/Seoul",
                        "self_intro_app",
                        "password123");
        dataSource.setDriverClassName("com.mysql.cj.jdbc.Driver");
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        TransactionTemplate transaction =
                new TransactionTemplate(new DataSourceTransactionManager(dataSource));

        transaction.executeWithoutResult(
                status -> {
                    String suffix = UUID.randomUUID().toString().replace("-", "");
                    jdbcTemplate.update(
                            """
                            INSERT INTO app_user
                              (login_id, email, password_hash, display_name, status, created_at, updated_at)
                            VALUES (?, NULL, 'fixture-hash', 'Purge Fixture', 'ACTIVE', NOW(6), NOW(6))
                            """,
                            "purge-fixture-" + suffix);
                    Long userId =
                            jdbcTemplate.queryForObject(
                                    "SELECT id FROM app_user WHERE login_id = ?",
                                    Long.class,
                                    "purge-fixture-" + suffix);
                    jdbcTemplate.update(
                            """
                            INSERT INTO workspace
                              (public_key, name, slug, workspace_type, status, publication_status,
                               created_at, updated_at, deleted_at, deletion_requested_by_user_id,
                               purge_after)
                            VALUES (UUID_TO_BIN(?), 'Purge Fixture', ?, 'PERSONAL', 'DELETED',
                                    'PRIVATE', NOW(6), NOW(6), NOW(6), ?, DATE_SUB(NOW(6), INTERVAL 1 DAY))
                            """,
                            UUID.randomUUID().toString(),
                            "w-purge-fixture-" + suffix.substring(0, 16),
                            userId);
                    Long workspaceId =
                            jdbcTemplate.queryForObject(
                                    "SELECT id FROM workspace WHERE slug = ?",
                                    Long.class,
                                    "w-purge-fixture-" + suffix.substring(0, 16));
                    jdbcTemplate.update(
                            """
                            INSERT INTO workspace_member
                              (workspace_id, user_id, workspace_role, status, joined_at)
                            VALUES (?, ?, 'OWNER', 'SUSPENDED', NOW(6))
                            """,
                            workspaceId,
                            userId);
                    jdbcTemplate.update(
                            """
                            INSERT INTO workspace_membership_invitation
                              (workspace_id, invited_by_user_id, recipient_email_canonical,
                               workspace_role, token_hash, status, expires_at, created_at)
                            VALUES (?, ?, ?, 'EDITOR', UNHEX(SHA2(?, 256)), 'REVOKED',
                                    DATE_SUB(NOW(6), INTERVAL 1 DAY), NOW(6))
                            """,
                            workspaceId,
                            userId,
                            "fixture-" + suffix + "@example.invalid",
                            suffix);
                    jdbcTemplate.update(
                            """
                            INSERT INTO security_audit_event
                              (event_type, actor_user_id, workspace_id, target_type, target_id,
                               result, reason_code, request_id, ip_hash, created_at)
                            VALUES ('WORKSPACE_FIXTURE', ?, ?, 'WORKSPACE', ?, 'SUCCESS', NULL,
                                    'fixture-request', 'fixture-ip', NOW(6))
                            """,
                            userId,
                            workspaceId,
                            workspaceId.toString());
                    jdbcTemplate.update(
                            """
                            INSERT INTO workspace_purge_job
                              (workspace_id, workspace_public_key, requested_by_user_id, status,
                               eligible_at, attempt_count, blocker_count, inventory_version,
                               created_at, updated_at)
                            VALUES (?, UUID_TO_BIN(?), ?, 'BLOCKED', DATE_SUB(NOW(6), INTERVAL 1 DAY),
                                    0, 1, 'workspace-purge-v1', NOW(6), NOW(6))
                            """,
                            workspaceId,
                            UUID.randomUUID().toString(),
                            userId);

                    MySqlWorkspaceRelationalStorageAdapter adapter =
                            new MySqlWorkspaceRelationalStorageAdapter(jdbcTemplate, true);
                    WorkspaceRelationalStoragePort.WorkspaceRelationalInventory before =
                            adapter.inspect(workspaceId, java.time.LocalDateTime.now());
                    assertThat(before.schemaVerified()).isTrue();
                    assertThat(before.cascadeRowCount()).isEqualTo(1);
                    assertThat(before.invitationRowCount()).isEqualTo(1);
                    assertThat(before.auditRowCount()).isEqualTo(1);
                    assertThat(before.purgeControlRowCount()).isEqualTo(1);

                    WorkspaceRelationalStoragePort.WorkspaceRelationalPurgeResult first =
                            adapter.purge(workspaceId, java.time.LocalDateTime.now());
                    assertThat(first.deletedInvitationRows()).isEqualTo(1);
                    assertThat(first.pseudonymizedAuditRows()).isEqualTo(1);
                    assertThat(first.deletedWorkspaceRows()).isEqualTo(1);
                    assertThat(first.retainedPurgeControlRows()).isEqualTo(1);
                    assertThat(
                                    jdbcTemplate.queryForObject(
                                            "SELECT COUNT(*) FROM workspace_member WHERE workspace_id = ?",
                                            Long.class,
                                            workspaceId))
                            .isZero();
                    assertThat(
                                    jdbcTemplate.queryForObject(
                                            """
                                            SELECT COUNT(*) FROM security_audit_event
                                            WHERE event_type = 'WORKSPACE_FIXTURE'
                                              AND actor_user_id IS NULL
                                              AND workspace_id IS NULL
                                              AND target_id IS NULL
                                              AND request_id IS NULL
                                              AND ip_hash IS NULL
                                            """,
                                            Long.class))
                            .isEqualTo(1);

                    WorkspaceRelationalStoragePort.WorkspaceRelationalPurgeResult second =
                            adapter.purge(workspaceId, java.time.LocalDateTime.now());
                    assertThat(second.deletedInvitationRows()).isZero();
                    assertThat(second.pseudonymizedAuditRows()).isZero();
                    assertThat(second.deletedWorkspaceRows()).isZero();
                    assertThat(second.retainedPurgeControlRows()).isEqualTo(1);

                    status.setRollbackOnly();
                });
    }
}
