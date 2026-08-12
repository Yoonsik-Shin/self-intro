package com.selfintro.modules.identity.infrastructure;

import com.selfintro.modules.identity.application.WorkspaceRelationalStoragePort;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class MySqlWorkspaceRelationalStorageAdapter implements WorkspaceRelationalStoragePort {

    private static final Map<String, String> WORKSPACE_TABLES = workspaceTableManifest();
    private static final Map<String, String> DIRECT_WORKSPACE_FOREIGN_KEYS = foreignKeyManifest();

    private final JdbcTemplate jdbcTemplate;
    private final boolean deleteEnabled;

    public MySqlWorkspaceRelationalStorageAdapter(
            JdbcTemplate jdbcTemplate,
            @Value("${app.workspace-purge.mysql-delete-enabled:false}") boolean deleteEnabled) {
        this.jdbcTemplate = jdbcTemplate;
        this.deleteEnabled = deleteEnabled;
    }

    @Override
    public WorkspaceRelationalInventory inspect(Long workspaceId, LocalDateTime now) {
        validateWorkspaceId(workspaceId);
        Set<String> liveTables = liveWorkspaceTables();
        Set<String> expectedTables = WORKSPACE_TABLES.keySet();
        Set<String> unknown = new LinkedHashSet<>(liveTables);
        unknown.removeAll(expectedTables);
        Set<String> missing = new LinkedHashSet<>(expectedTables);
        missing.removeAll(liveTables);
        Set<String> foreignKeyDrift = inspectForeignKeyDrift();

        long cascadeRows = countRows(workspaceId, "CASCADE_WITH_WORKSPACE");
        long invitationRows = count("workspace_membership_invitation", workspaceId);
        long auditRows = count("security_audit_event", workspaceId);
        long controlRows = count("workspace_purge_job", workspaceId);

        Map<String, Object> workspace =
                jdbcTemplate.query(
                        "SELECT status, purge_after FROM workspace WHERE id = ?",
                        resultSet -> {
                            if (!resultSet.next()) return null;
                            Map<String, Object> row = new LinkedHashMap<>();
                            row.put("status", resultSet.getString("status"));
                            row.put("purge_after", resultSet.getTimestamp("purge_after"));
                            return row;
                        },
                        workspaceId);
        boolean closed = workspace != null && "DELETED".equals(workspace.get("status"));
        Timestamp purgeAfter = workspace == null ? null : (Timestamp) workspace.get("purge_after");
        boolean graceElapsed = purgeAfter != null && !purgeAfter.toLocalDateTime().isAfter(now);

        return new WorkspaceRelationalInventory(
                cascadeRows,
                invitationRows,
                auditRows,
                controlRows,
                workspace != null,
                closed,
                graceElapsed,
                Set.copyOf(unknown),
                Set.copyOf(missing),
                Set.copyOf(foreignKeyDrift));
    }

    @Override
    @Transactional
    public WorkspaceRelationalPurgeResult purge(Long workspaceId, LocalDateTime now) {
        if (!deleteEnabled) {
            throw new IllegalStateException("Workspace MySQL purge 삭제 기능이 비활성화되어 있습니다.");
        }
        WorkspaceRelationalInventory before = inspect(workspaceId, now);
        if (!before.schemaVerified()) {
            throw new IllegalStateException("Workspace MySQL schema/FK inventory가 일치하지 않습니다.");
        }
        if (!before.workspaceExists()) {
            assertNoWorkspaceRowsRemain(workspaceId);
            return new WorkspaceRelationalPurgeResult(0, 0, 0, before.purgeControlRowCount());
        }
        if (!before.closedWorkspace() || !before.graceElapsed()) {
            throw new IllegalStateException("폐쇄 및 유예 기간이 끝난 Workspace만 purge할 수 있습니다.");
        }

        int pseudonymizedAudits =
                jdbcTemplate.update(
                        """
                        UPDATE security_audit_event
                        SET actor_user_id = NULL,
                            workspace_id = NULL,
                            target_id = NULL,
                            request_id = NULL,
                            ip_hash = NULL
                        WHERE workspace_id = ?
                        """,
                        workspaceId);
        int deletedInvitations =
                jdbcTemplate.update(
                        "DELETE FROM workspace_membership_invitation WHERE workspace_id = ?",
                        workspaceId);
        int deletedWorkspace =
                jdbcTemplate.update(
                        """
                        DELETE FROM workspace
                        WHERE id = ?
                          AND status = 'DELETED'
                          AND purge_after IS NOT NULL
                          AND purge_after <= ?
                        """,
                        workspaceId,
                        now);
        if (deletedWorkspace != 1) {
            throw new IllegalStateException("Workspace MySQL purge 대상이 사라졌거나 상태가 변경되었습니다.");
        }

        assertNoWorkspaceRowsRemain(workspaceId);
        long retainedControlRows = count("workspace_purge_job", workspaceId);
        return new WorkspaceRelationalPurgeResult(
                deletedInvitations, pseudonymizedAudits, deletedWorkspace, retainedControlRows);
    }

    private void assertNoWorkspaceRowsRemain(Long workspaceId) {
        for (Map.Entry<String, String> entry : WORKSPACE_TABLES.entrySet()) {
            if ("RETAIN_PURGE_CONTROL_RECORD".equals(entry.getValue())) continue;
            long remaining = count(entry.getKey(), workspaceId);
            if (remaining != 0) {
                throw new IllegalStateException("Workspace MySQL purge 후 잔여 row가 감지되었습니다.");
            }
        }
        Long workspaceRows =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM workspace WHERE id = ?", Long.class, workspaceId);
        if (workspaceRows != null && workspaceRows != 0) {
            throw new IllegalStateException("Workspace MySQL purge 후 Workspace row가 남았습니다.");
        }
    }

    private Set<String> liveWorkspaceTables() {
        return new LinkedHashSet<>(
                jdbcTemplate.queryForList(
                        """
                        SELECT table_name
                        FROM information_schema.columns
                        WHERE table_schema = DATABASE()
                          AND column_name = 'workspace_id'
                        ORDER BY table_name
                        """,
                        String.class));
    }

    private Set<String> inspectForeignKeyDrift() {
        Map<String, String> live = new LinkedHashMap<>();
        jdbcTemplate.query(
                """
                SELECT k.table_name, r.delete_rule
                FROM information_schema.key_column_usage k
                JOIN information_schema.referential_constraints r
                  ON r.constraint_schema = k.constraint_schema
                 AND r.constraint_name = k.constraint_name
                WHERE k.constraint_schema = DATABASE()
                  AND k.referenced_table_name = 'workspace'
                  AND k.referenced_column_name = 'id'
                ORDER BY k.table_name
                """,
                (RowCallbackHandler)
                        resultSet ->
                                live.put(
                                        resultSet.getString("table_name"),
                                        resultSet.getString("delete_rule")));
        Set<String> drift = new LinkedHashSet<>();
        DIRECT_WORKSPACE_FOREIGN_KEYS.forEach(
                (table, rule) -> {
                    if (!rule.equals(live.get(table))) drift.add(table);
                });
        live.keySet().stream()
                .filter(table -> !DIRECT_WORKSPACE_FOREIGN_KEYS.containsKey(table))
                .forEach(drift::add);
        return drift;
    }

    private long countRows(Long workspaceId, String handling) {
        long total = 0;
        for (Map.Entry<String, String> entry : WORKSPACE_TABLES.entrySet()) {
            if (handling.equals(entry.getValue())) {
                total += count(entry.getKey(), workspaceId);
            }
        }
        return total;
    }

    private long count(String table, Long workspaceId) {
        if (!WORKSPACE_TABLES.containsKey(table)) {
            throw new IllegalArgumentException("Workspace MySQL manifest에 없는 테이블입니다.");
        }
        Long count =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM `" + table + "` WHERE workspace_id = ?",
                        Long.class,
                        workspaceId);
        return count == null ? 0 : count;
    }

    private void validateWorkspaceId(Long workspaceId) {
        if (workspaceId == null || workspaceId <= 0) {
            throw new IllegalArgumentException("workspaceId가 올바르지 않습니다.");
        }
    }

    private static Map<String, String> workspaceTableManifest() {
        Map<String, String> tables = new LinkedHashMap<>();
        tables.put("competency", "CASCADE_WITH_WORKSPACE");
        tables.put("decision_study_link", "CASCADE_WITH_WORKSPACE");
        tables.put("experience", "CASCADE_WITH_WORKSPACE");
        tables.put("portfolio_case_study", "CASCADE_WITH_WORKSPACE");
        tables.put("print_template", "CASCADE_WITH_WORKSPACE");
        tables.put("profile", "CASCADE_WITH_WORKSPACE");
        tables.put("security_audit_event", "RETAIN_AND_PSEUDONYMIZE");
        tables.put("study", "CASCADE_WITH_WORKSPACE");
        tables.put("study_plan", "CASCADE_WITH_WORKSPACE");
        tables.put("study_taxonomy_curation", "CASCADE_WITH_WORKSPACE");
        tables.put("tag", "CASCADE_WITH_WORKSPACE");
        tables.put("workspace_job_application", "CASCADE_WITH_WORKSPACE");
        tables.put("workspace_learning_resource", "CASCADE_WITH_WORKSPACE");
        tables.put("workspace_member", "CASCADE_WITH_WORKSPACE");
        tables.put("workspace_membership_invitation", "DELETE_BEFORE_WORKSPACE");
        tables.put("workspace_publication_revision", "CASCADE_WITH_WORKSPACE");
        tables.put("workspace_purge_job", "RETAIN_PURGE_CONTROL_RECORD");
        tables.put("workspace_skill", "CASCADE_WITH_WORKSPACE");
        tables.put("workspace_slug_alias", "CASCADE_WITH_WORKSPACE");
        tables.put("workspace_visitor_daily_visit", "CASCADE_WITH_WORKSPACE");
        tables.put("workspace_visitor_hourly_visit", "CASCADE_WITH_WORKSPACE");
        return Map.copyOf(tables);
    }

    private static Map<String, String> foreignKeyManifest() {
        Map<String, String> foreignKeys = new LinkedHashMap<>();
        WORKSPACE_TABLES.forEach(
                (table, handling) -> {
                    if ("CASCADE_WITH_WORKSPACE".equals(handling)) {
                        foreignKeys.put(table, "CASCADE");
                    }
                });
        foreignKeys.put("workspace_membership_invitation", "NO ACTION");
        return Map.copyOf(foreignKeys);
    }
}
