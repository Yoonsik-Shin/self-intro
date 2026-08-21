package com.selfintro.modules.billing.application;

import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkspaceOwnershipBillingGuard {

    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public void suspendAutomaticSecrets(Long workspaceId) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update(
                """
                UPDATE billing_payment_method pm
                JOIN billing_customer bc ON bc.id = pm.billing_customer_id
                   SET pm.status = 'SUSPENDED', pm.updated_at = ?
                 WHERE bc.workspace_id = ? AND pm.status = 'ACTIVE'
                """,
                now,
                workspaceId);
        jdbcTemplate.update(
                """
                UPDATE workspace_subscription
                   SET payment_method_id = NULL,
                       status = CASE WHEN plan_code = 'FREE' THEN status ELSE 'CANCEL_AT_PERIOD_END' END,
                       cancel_at_period_end = CASE WHEN plan_code = 'FREE' THEN 0 ELSE 1 END,
                       renewal_lease_until = NULL, updated_at = ?, version = version + 1
                 WHERE workspace_id = ?
                """,
                now,
                workspaceId);
        jdbcTemplate.update(
                """
                UPDATE workspace_ai_provider_credential
                   SET status = 'SUSPENDED', updated_at = ?
                 WHERE workspace_id = ? AND status = 'ACTIVE'
                """,
                now,
                workspaceId);
        jdbcTemplate.update(
                """
                UPDATE workspace_ai_policy
                   SET allow_generation = 0, allow_embedding = 0,
                       version = version + 1, updated_at = ?
                 WHERE workspace_id = ?
                """,
                now,
                workspaceId);
    }
}
