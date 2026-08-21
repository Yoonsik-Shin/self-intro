package com.selfintro.modules.aiusage.application;

import java.nio.ByteBuffer;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AiUsageLedgerService {

    private static final String PLATFORM_MANAGED = "PLATFORM_MANAGED";

    private final JdbcTemplate jdbcTemplate;

    @Value("${app.ai.usage.enforcement-enabled:false}")
    private boolean enforcementEnabled;

    @Value("${app.ai.usage.evidence-policy-version:2026-08-21}")
    private String evidencePolicyVersion;

    @Value("${app.ai.usage.consent-policy-version:2026-08-21}")
    private String consentPolicyVersion;

    @Transactional
    public AiUsageReservation reserve(
            Long workspaceId,
            Long actorUserId,
            AiFeature feature,
            String operationCode,
            String sessionKey,
            boolean refinement,
            int estimatedPoints) {
        return reserve(
                workspaceId,
                actorUserId,
                feature,
                operationCode,
                sessionKey,
                refinement,
                estimatedPoints,
                enforcementEnabled);
    }

    @Transactional
    public AiUsageReservation reserve(
            Long workspaceId,
            Long actorUserId,
            AiFeature feature,
            String operationCode,
            String sessionKey,
            boolean refinement,
            int estimatedPoints,
            boolean enforceUsage) {
        requirePositive(workspaceId, "workspaceId");
        requirePositive(actorUserId, "actorUserId");
        Objects.requireNonNull(feature, "feature");
        requireCode(operationCode, "operationCode");
        requireSessionKey(sessionKey);
        if (estimatedPoints < 0) {
            throw new IllegalArgumentException("estimatedPoints는 음수일 수 없습니다.");
        }

        SubscriptionSnapshot subscription = lockSubscription(workspaceId);
        ensureMonthlyGrant(subscription);

        int pointsToReserve =
                PLATFORM_MANAGED.equals(subscription.credentialMode()) ? estimatedPoints : 0;
        boolean freeBenefit =
                enforceUsage
                        && "FREE".equals(subscription.planCode())
                        && claimFreeBenefit(
                                workspaceId, actorUserId, feature, sessionKey, refinement);
        if (enforceUsage
                && "FREE".equals(subscription.planCode())
                && !freeBenefit
                && (pointsToReserve == 0 || pointsToReserve > availablePoints(workspaceId))) {
            throw new ResponseStatusException(
                    HttpStatus.PAYMENT_REQUIRED,
                    "이번 달 무료 AI 세션을 모두 사용했습니다. 다음 달, 유료 플랜 또는 구매 point로 이용해 주세요.");
        }
        if (enforceUsage && !freeBenefit && pointsToReserve > availablePoints(workspaceId)) {
            throw new ResponseStatusException(
                    HttpStatus.PAYMENT_REQUIRED, "AI point가 부족합니다. 새 작업을 시작할 수 없습니다.");
        }
        int persistedReservation = enforceUsage && !freeBenefit ? pointsToReserve : 0;

        UUID publicId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(
                connection -> {
                    PreparedStatement statement =
                            connection.prepareStatement(
                                    """
                                    INSERT INTO ai_usage (
                                      public_id, workspace_id, actor_user_id, feature_code,
                                      operation_code, session_key, credential_mode, status, charge_outcome,
                                      estimated_points, reserved_points, committed_points,
                                      evidence_policy_version, consent_policy_version,
                                      started_at, created_at, updated_at
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'RESERVED', 'PENDING', ?, ?, 0, ?, ?, ?, ?, ?)
                                    """,
                                    Statement.RETURN_GENERATED_KEYS);
                    statement.setBytes(1, uuidBytes(publicId));
                    statement.setLong(2, workspaceId);
                    statement.setLong(3, actorUserId);
                    statement.setString(4, feature.name());
                    statement.setString(5, operationCode);
                    statement.setString(6, sessionKey);
                    statement.setString(7, subscription.credentialMode());
                    statement.setInt(8, estimatedPoints);
                    statement.setInt(9, persistedReservation);
                    statement.setString(10, evidencePolicyVersion);
                    statement.setString(11, consentPolicyVersion);
                    statement.setTimestamp(12, Timestamp.valueOf(now));
                    statement.setTimestamp(13, Timestamp.valueOf(now));
                    statement.setTimestamp(14, Timestamp.valueOf(now));
                    return statement;
                },
                keyHolder);

        Long usageId = Objects.requireNonNull(keyHolder.getKey()).longValue();
        if (freeBenefit && !refinement) {
            jdbcTemplate.update(
                    """
                    UPDATE ai_free_session SET first_ai_usage_id = ?, updated_at = ?
                     WHERE workspace_id = ? AND feature_code = ? AND benefit_month = ?
                       AND first_ai_usage_id IS NULL
                    """,
                    usageId,
                    now,
                    workspaceId,
                    feature.name(),
                    LocalDate.now().withDayOfMonth(1));
        }
        if (persistedReservation > 0) {
            reserveFromBuckets(workspaceId, usageId, publicId, persistedReservation, now);
        }
        return new AiUsageReservation(
                usageId,
                publicId,
                workspaceId,
                actorUserId,
                feature,
                operationCode,
                sessionKey,
                estimatedPoints,
                persistedReservation,
                enforceUsage,
                evidencePolicyVersion,
                consentPolicyVersion);
    }

    @Transactional
    public void markProviderCalled(AiUsageReservation reservation) {
        jdbcTemplate.update(
                """
                UPDATE ai_usage
                   SET status = 'PROVIDER_CALLED', provider_called_at = ?, updated_at = ?
                 WHERE id = ? AND status = 'RESERVED'
                """,
                LocalDateTime.now(),
                LocalDateTime.now(),
                reservation.usageId());
    }

    @Transactional
    public void commit(AiUsageReservation reservation, AiUsageResult result) {
        Objects.requireNonNull(result, "result");
        int actualPoints =
                reservation.reservedPoints() == 0 ? 0 : Math.max(0, result.actualPoints());
        if (reservation.enforcementEnabled()) {
            settleDifference(reservation, actualPoints);
        }
        LocalDateTime now = LocalDateTime.now();
        int updated =
                jdbcTemplate.update(
                        """
                        UPDATE ai_usage
                           SET provider = ?, model = ?, region = ?, status = 'SUCCEEDED',
                               charge_outcome = ?, committed_points = ?, input_tokens = ?,
                               cached_input_tokens = ?, output_tokens = ?, retry_count = ?,
                               provider_cost_usd = ?, provider_cost_krw = ?, price_version = ?,
                               evidence_snapshot_hash = ?, completed_at = ?, updated_at = ?
                         WHERE id = ? AND status IN ('RESERVED', 'PROVIDER_CALLED')
                        """,
                        result.provider(),
                        result.model(),
                        result.region(),
                        reservation.enforcementEnabled() ? "CHARGED" : "SHADOW_ONLY",
                        reservation.enforcementEnabled() ? actualPoints : 0,
                        nullableToken(result.inputTokens()),
                        nullableToken(result.cachedInputTokens()),
                        nullableToken(result.outputTokens()),
                        Math.max(0, result.retryCount()),
                        result.providerCostUsd(),
                        result.providerCostKrw(),
                        result.priceVersion(),
                        result.evidenceSnapshotHash(),
                        now,
                        now,
                        reservation.usageId());
        requireSingleTransition(updated);
    }

    @Transactional
    public void release(
            AiUsageReservation reservation, String failureCode, boolean platformBurden) {
        requireCode(failureCode, "failureCode");
        if (reservation.enforcementEnabled() && reservation.reservedPoints() > 0) {
            releaseAllReservations(reservation);
        }
        LocalDateTime now = LocalDateTime.now();
        int updated =
                jdbcTemplate.update(
                        """
                        UPDATE ai_usage
                           SET status = 'FAILED', charge_outcome = ?, committed_points = 0,
                               failure_code = ?, completed_at = ?, updated_at = ?
                         WHERE id = ? AND status IN ('RESERVED', 'PROVIDER_CALLED')
                        """,
                        platformBurden ? "PLATFORM_BURDEN" : "NOT_CHARGED",
                        failureCode,
                        now,
                        now,
                        reservation.usageId());
        requireSingleTransition(updated);
    }

    public int availablePoints(Long workspaceId) {
        Integer balance =
                jdbcTemplate.queryForObject(
                        """
                        SELECT COALESCE(SUM(points), 0)
                          FROM ai_point_ledger
                         WHERE workspace_id = ?
                           AND (expires_at IS NULL OR expires_at > ?)
                        """,
                        Integer.class,
                        workspaceId,
                        LocalDateTime.now());
        return balance == null ? 0 : balance;
    }

    private SubscriptionSnapshot lockSubscription(Long workspaceId) {
        ensureWorkspaceDefaults(workspaceId);
        List<SubscriptionSnapshot> subscriptions =
                jdbcTemplate.query(
                        """
                        SELECT s.id, s.plan_code, p.included_ai_points,
                               COALESCE(a.credential_mode, 'PLATFORM_MANAGED')
                          FROM workspace_subscription s
                          JOIN billing_plan p ON p.code = s.plan_code
                          LEFT JOIN workspace_ai_policy a ON a.workspace_id = s.workspace_id
                         WHERE s.workspace_id = ?
                           AND (s.status IN ('ACTIVE', 'GRACE_PERIOD')
                                OR (s.status = 'CANCELED' AND s.plan_code = 'FREE'))
                         FOR UPDATE
                        """,
                        (resultSet, rowNum) ->
                                new SubscriptionSnapshot(
                                        resultSet.getLong(1),
                                        workspaceId,
                                        resultSet.getString(2),
                                        resultSet.getInt(3),
                                        resultSet.getString(4)),
                        workspaceId);
        if (subscriptions.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Workspace 구독 기준선이 없습니다. 운영자에게 문의해 주세요.");
        }
        return subscriptions.get(0);
    }

    @Transactional
    public void ensureWorkspaceDefaults(Long workspaceId) {
        Integer workspaceCount =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM workspace WHERE id = ?", Integer.class, workspaceId);
        if (workspaceCount == null || workspaceCount == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace를 찾을 수 없습니다.");
        }
        Integer subscriptionCount =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM workspace_subscription WHERE workspace_id = ?",
                        Integer.class,
                        workspaceId);
        if (subscriptionCount == null || subscriptionCount == 0) {
            LocalDate firstDay = LocalDate.now().withDayOfMonth(1);
            try {
                jdbcTemplate.update(
                        """
                        INSERT INTO workspace_subscription (
                          workspace_id, plan_code, status, billing_cycle,
                          current_period_start, current_period_end, cancel_at_period_end,
                          version, created_at, updated_at
                        ) VALUES (?, 'FREE', 'ACTIVE', NULL, ?, ?, 0, 0, ?, ?)
                        """,
                        workspaceId,
                        firstDay.atStartOfDay(),
                        firstDay.plusMonths(1).atStartOfDay(),
                        LocalDateTime.now(),
                        LocalDateTime.now());
            } catch (DuplicateKeyException ignored) {
                // 다른 요청이 같은 Workspace의 기본 구독을 먼저 만들었다.
            }
        }
        Integer policyCount =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM workspace_ai_policy WHERE workspace_id = ?",
                        Integer.class,
                        workspaceId);
        if (policyCount == null || policyCount == 0) {
            try {
                jdbcTemplate.update(
                        """
                        INSERT INTO workspace_ai_policy (
                          workspace_id, credential_mode, provider, model_tier, region,
                          allow_generation, allow_embedding, policy_version, version,
                          created_at, updated_at
                        ) VALUES (?, 'PLATFORM_MANAGED', 'NVIDIA', 'STANDARD', 'PLATFORM_DEFAULT',
                                  1, 1, '2026-08-21', 0, ?, ?)
                        """,
                        workspaceId,
                        LocalDateTime.now(),
                        LocalDateTime.now());
            } catch (DuplicateKeyException ignored) {
                // 다른 요청이 같은 Workspace의 기본 AI 정책을 먼저 만들었다.
            }
        }
    }

    private void ensureMonthlyGrant(SubscriptionSnapshot subscription) {
        if (subscription.includedPoints() <= 0) {
            return;
        }
        LocalDate month = LocalDate.now().withDayOfMonth(1);
        String idempotencyKey =
                "MONTHLY_GRANT:"
                        + subscription.workspaceId()
                        + ":"
                        + subscription.planCode()
                        + ":"
                        + month;
        Integer count =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM ai_point_ledger WHERE idempotency_key = ?",
                        Integer.class,
                        idempotencyKey);
        if (count != null && count > 0) {
            return;
        }
        LocalDateTime expiresAt =
                month.with(TemporalAdjusters.lastDayOfMonth()).plusDays(1).atStartOfDay();
        jdbcTemplate.update(
                """
                INSERT INTO ai_point_ledger (
                  workspace_id, ai_usage_id, entry_type, bucket_type, points,
                  idempotency_key, expires_at, created_at
                ) VALUES (?, NULL, 'GRANT', 'MONTHLY_INCLUDED', ?, ?, ?, ?)
                """,
                subscription.workspaceId(),
                subscription.includedPoints(),
                idempotencyKey,
                expiresAt,
                LocalDateTime.now());
    }

    private boolean claimFreeBenefit(
            Long workspaceId,
            Long actorUserId,
            AiFeature feature,
            String sessionKey,
            boolean refinement) {
        LocalDate benefitMonth = LocalDate.now().withDayOfMonth(1);
        LocalDateTime now = LocalDateTime.now();
        if (!refinement) {
            Integer existing =
                    jdbcTemplate.queryForObject(
                            """
                            SELECT COUNT(*) FROM ai_free_session
                             WHERE workspace_id = ? AND feature_code = ? AND benefit_month = ?
                            """,
                            Integer.class,
                            workspaceId,
                            feature.name(),
                            benefitMonth);
            if (existing != null && existing > 0) {
                return false;
            }
            jdbcTemplate.update(
                    """
                    INSERT INTO ai_free_session (
                      workspace_id, actor_user_id, feature_code, session_key, benefit_month,
                      status, revision_count, first_ai_usage_id, expires_at, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', 0, NULL, ?, ?, ?)
                    """,
                    workspaceId,
                    actorUserId,
                    feature.name(),
                    sessionKey,
                    benefitMonth,
                    now.plusDays(7),
                    now,
                    now);
            return true;
        }

        int updated =
                jdbcTemplate.update(
                        """
                        UPDATE ai_free_session
                           SET revision_count = revision_count + 1, updated_at = ?
                         WHERE workspace_id = ? AND feature_code = ? AND benefit_month = ?
                           AND session_key = ? AND status = 'ACTIVE' AND expires_at > ?
                           AND revision_count < 3
                        """,
                        now,
                        workspaceId,
                        feature.name(),
                        benefitMonth,
                        sessionKey,
                        now);
        if (updated == 1) {
            return true;
        }
        Integer existing =
                jdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*) FROM ai_free_session
                         WHERE workspace_id = ? AND feature_code = ? AND benefit_month = ?
                        """,
                        Integer.class,
                        workspaceId,
                        feature.name(),
                        benefitMonth);
        if (existing != null && existing > 0) {
            return false;
        }
        jdbcTemplate.update(
                """
                INSERT INTO ai_free_session (
                  workspace_id, actor_user_id, feature_code, session_key, benefit_month,
                  status, revision_count, first_ai_usage_id, expires_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', 1, NULL, ?, ?, ?)
                """,
                workspaceId,
                actorUserId,
                feature.name(),
                sessionKey,
                benefitMonth,
                now.plusDays(7),
                now,
                now);
        return true;
    }

    private void reserveFromBuckets(
            Long workspaceId, Long usageId, UUID publicId, int points, LocalDateTime now) {
        int monthlyAvailable = bucketBalance(workspaceId, "MONTHLY_INCLUDED", true, now);
        int monthly = Math.min(points, Math.max(0, monthlyAvailable));
        int purchased = points - monthly;
        if (monthly > 0) {
            LocalDateTime expiresAt =
                    LocalDate.now()
                            .with(TemporalAdjusters.lastDayOfMonth())
                            .plusDays(1)
                            .atStartOfDay();
            insertLedger(
                    workspaceId,
                    usageId,
                    "RESERVE",
                    "MONTHLY_INCLUDED",
                    -monthly,
                    "AI_RESERVE:" + publicId + ":MONTHLY",
                    expiresAt);
        }
        if (purchased > 0) {
            insertLedger(
                    workspaceId,
                    usageId,
                    "RESERVE",
                    "PURCHASED",
                    -purchased,
                    "AI_RESERVE:" + publicId + ":PURCHASED",
                    null);
        }
    }

    private int bucketBalance(
            Long workspaceId, String bucketType, boolean expiring, LocalDateTime now) {
        String expiryClause =
                expiring ? "expires_at IS NOT NULL AND expires_at > ?" : "expires_at IS NULL";
        Integer balance =
                expiring
                        ? jdbcTemplate.queryForObject(
                                "SELECT COALESCE(SUM(points), 0) FROM ai_point_ledger WHERE workspace_id = ? AND bucket_type = ? AND "
                                        + expiryClause,
                                Integer.class,
                                workspaceId,
                                bucketType,
                                now)
                        : jdbcTemplate.queryForObject(
                                "SELECT COALESCE(SUM(points), 0) FROM ai_point_ledger WHERE workspace_id = ? AND bucket_type = ? AND "
                                        + expiryClause,
                                Integer.class,
                                workspaceId,
                                bucketType);
        return balance == null ? 0 : balance;
    }

    private void settleDifference(AiUsageReservation reservation, int actualPoints) {
        int difference = reservation.reservedPoints() - actualPoints;
        if (difference == 0) {
            return;
        }
        if (difference > 0) {
            releasePoints(reservation, difference, "COMMIT_RELEASE");
            return;
        }
        insertLedger(
                reservation.workspaceId(),
                reservation.usageId(),
                "COMMIT_ADJUSTMENT",
                "PURCHASED",
                difference,
                "AI_COMMIT_ADJUSTMENT:" + reservation.publicId(),
                null);
    }

    private void releaseAllReservations(AiUsageReservation reservation) {
        releasePoints(reservation, reservation.reservedPoints(), "FAILURE_RELEASE");
    }

    private void releasePoints(
            AiUsageReservation reservation, int pointsToRelease, String entryType) {
        List<ReservedBucket> buckets =
                jdbcTemplate.query(
                        """
                        SELECT bucket_type, -SUM(points) AS reserved, MAX(expires_at) AS expires_at
                          FROM ai_point_ledger
                         WHERE ai_usage_id = ? AND entry_type = 'RESERVE'
                         GROUP BY bucket_type
                         ORDER BY CASE WHEN bucket_type = 'PURCHASED' THEN 0 ELSE 1 END
                        """,
                        (resultSet, rowNum) ->
                                new ReservedBucket(
                                        resultSet.getString(1),
                                        resultSet.getInt(2),
                                        resultSet.getTimestamp(3) == null
                                                ? null
                                                : resultSet.getTimestamp(3).toLocalDateTime()),
                        reservation.usageId());
        int remaining = pointsToRelease;
        for (ReservedBucket bucket : buckets) {
            if (remaining <= 0) {
                break;
            }
            int released = Math.min(remaining, bucket.points());
            insertLedger(
                    reservation.workspaceId(),
                    reservation.usageId(),
                    entryType,
                    bucket.bucketType(),
                    released,
                    "AI_" + entryType + ":" + reservation.publicId() + ":" + bucket.bucketType(),
                    bucket.expiresAt());
            remaining -= released;
        }
    }

    private void insertLedger(
            Long workspaceId,
            Long usageId,
            String entryType,
            String bucketType,
            int points,
            String idempotencyKey,
            LocalDateTime expiresAt) {
        jdbcTemplate.update(
                """
                INSERT INTO ai_point_ledger (
                  workspace_id, ai_usage_id, entry_type, bucket_type, points,
                  idempotency_key, expires_at, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                workspaceId,
                usageId,
                entryType,
                bucketType,
                points,
                idempotencyKey,
                expiresAt,
                LocalDateTime.now());
    }

    private void requireSingleTransition(int updated) {
        if (updated != 1) {
            throw new IllegalStateException("AI usage 상태 전이가 중복되었거나 이미 종료되었습니다.");
        }
    }

    private static byte[] uuidBytes(UUID value) {
        return ByteBuffer.allocate(16)
                .putLong(value.getMostSignificantBits())
                .putLong(value.getLeastSignificantBits())
                .array();
    }

    private static Long nullableToken(long value) {
        return value == 0 ? null : value;
    }

    private static void requirePositive(Long value, String field) {
        if (value == null || value <= 0) {
            throw new IllegalArgumentException(field + "는 양수여야 합니다.");
        }
    }

    private static void requireCode(String value, String field) {
        if (value == null
                || value.isBlank()
                || value.length() > 80
                || !value.matches("[A-Z][A-Z0-9_]*")) {
            throw new IllegalArgumentException(field + "에는 제한된 코드만 사용할 수 있습니다.");
        }
    }

    private static void requireSessionKey(String value) {
        if (value == null || value.isBlank() || value.length() > 120) {
            throw new IllegalArgumentException("AI sessionKey가 올바르지 않습니다.");
        }
    }

    private record SubscriptionSnapshot(
            Long subscriptionId,
            Long workspaceId,
            String planCode,
            int includedPoints,
            String credentialMode) {}

    private record ReservedBucket(String bucketType, int points, LocalDateTime expiresAt) {}
}
