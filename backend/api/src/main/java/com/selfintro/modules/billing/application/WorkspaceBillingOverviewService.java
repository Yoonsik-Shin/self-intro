package com.selfintro.modules.billing.application;

import com.selfintro.modules.aiusage.application.AiUsageLedgerService;
import com.selfintro.modules.billing.presentation.dto.WorkspaceAiUsageResponse;
import com.selfintro.modules.billing.presentation.dto.WorkspaceBillingOverviewResponse;
import java.nio.ByteBuffer;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class WorkspaceBillingOverviewService {

    private final JdbcTemplate jdbcTemplate;
    private final AiUsageLedgerService usageLedgerService;

    @Value("${app.ai.usage.enforcement-enabled:false}")
    private boolean enforcementEnabled;

    @Value("${app.ai.usage.consent-policy-version:2026-08-21}")
    private String consentPolicyVersion;

    public WorkspaceBillingOverviewResponse overview(Long workspaceId) {
        usageLedgerService.ensureWorkspaceDefaults(workspaceId);
        List<WorkspaceBillingOverviewResponse> rows =
                jdbcTemplate.query(
                        """
                        SELECT p.code, p.display_name, p.monthly_price_krw, p.annual_price_krw,
                               p.included_ai_points, p.included_members,
                               s.status, s.billing_cycle, s.current_period_start, s.current_period_end,
                               s.cancel_at_period_end,
                               a.provider, a.region, a.credential_mode,
                               (SELECT COUNT(*) FROM workspace_member m
                                 WHERE m.workspace_id = s.workspace_id AND m.status = 'ACTIVE') AS active_members
                          FROM workspace_subscription s
                          JOIN billing_plan p ON p.code = s.plan_code
                          JOIN workspace_ai_policy a ON a.workspace_id = s.workspace_id
                         WHERE s.workspace_id = ?
                        """,
                        (resultSet, rowNum) ->
                                new WorkspaceBillingOverviewResponse(
                                        resultSet.getString(1),
                                        resultSet.getString(2),
                                        resultSet.getInt(3),
                                        resultSet.getInt(4),
                                        resultSet.getInt(5),
                                        usageLedgerService.availablePoints(workspaceId),
                                        resultSet.getInt(6),
                                        resultSet.getLong(15),
                                        3000,
                                        resultSet.getString(7),
                                        resultSet.getString(8),
                                        resultSet.getTimestamp(9).toLocalDateTime(),
                                        resultSet.getTimestamp(10).toLocalDateTime(),
                                        resultSet.getBoolean(11),
                                        enforcementEnabled,
                                        resultSet.getString(12),
                                        resultSet.getString(13),
                                        resultSet.getString(14),
                                        consentPolicyVersion),
                        workspaceId);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Workspace 구독 기준선을 찾을 수 없습니다.");
        }
        return rows.get(0);
    }

    public WorkspaceAiUsageResponse recentUsage(Long workspaceId, int limit) {
        int boundedLimit = Math.max(1, Math.min(limit, 100));
        List<WorkspaceAiUsageResponse.Item> items =
                jdbcTemplate.query(
                        """
                        SELECT public_id, feature_code, operation_code, provider, model, status,
                               charge_outcome, estimated_points, committed_points, input_tokens,
                               output_tokens, failure_code, started_at, completed_at
                          FROM ai_usage
                         WHERE workspace_id = ?
                         ORDER BY created_at DESC, id DESC
                         LIMIT ?
                        """,
                        (resultSet, rowNum) ->
                                new WorkspaceAiUsageResponse.Item(
                                        uuid(resultSet.getBytes(1)).toString(),
                                        resultSet.getString(2),
                                        resultSet.getString(3),
                                        resultSet.getString(4),
                                        resultSet.getString(5),
                                        resultSet.getString(6),
                                        resultSet.getString(7),
                                        resultSet.getInt(8),
                                        resultSet.getInt(9),
                                        nullableLong(resultSet.getLong(10), resultSet.wasNull()),
                                        nullableLong(resultSet.getLong(11), resultSet.wasNull()),
                                        resultSet.getString(12),
                                        resultSet.getTimestamp(13).toLocalDateTime(),
                                        nullableDateTime(resultSet.getTimestamp(14))),
                        workspaceId,
                        boundedLimit);
        return new WorkspaceAiUsageResponse(items);
    }

    private static UUID uuid(byte[] bytes) {
        ByteBuffer buffer = ByteBuffer.wrap(bytes);
        return new UUID(buffer.getLong(), buffer.getLong());
    }

    private static Long nullableLong(long value, boolean wasNull) {
        return wasNull ? null : value;
    }

    private static LocalDateTime nullableDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }
}
