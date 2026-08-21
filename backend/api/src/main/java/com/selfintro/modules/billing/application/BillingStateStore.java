package com.selfintro.modules.billing.application;

import com.selfintro.global.secret.SecretProvider;
import java.nio.ByteBuffer;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class BillingStateStore {

    private final JdbcTemplate jdbcTemplate;
    private final SecretProvider secretProvider;

    @Transactional
    public BillingCustomer ensureCustomer(Long workspaceId) {
        List<BillingCustomer> existing = customer(workspaceId);
        if (!existing.isEmpty()) {
            return existing.get(0);
        }
        String customerKey = "ws_" + UUID.randomUUID();
        try {
            jdbcTemplate.update(
                    """
                    INSERT INTO billing_customer
                      (workspace_id, provider, provider_customer_key, status, created_at, updated_at)
                    VALUES (?, 'TOSS', ?, 'ACTIVE', CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6))
                    """,
                    workspaceId,
                    customerKey);
        } catch (DuplicateKeyException ignored) {
            // Another request initialized the same Workspace. Re-read the unique row.
        }
        return customer(workspaceId).stream()
                .findFirst()
                .orElseThrow(
                        () -> new IllegalStateException("Billing customer initialization failed"));
    }

    @Transactional
    public Long replacePaymentMethod(
            BillingCustomer customer,
            Long actorUserId,
            BillingProviderPort.RegisteredMethod method) {
        String reference =
                secretProvider.store(
                        "billing/workspaces/" + customer.workspaceId() + "/methods",
                        method.billingKey());
        try {
            List<PaymentMethodSecret> oldMethods =
                    jdbcTemplate.query(
                            """
                            SELECT id, secret_reference
                              FROM billing_payment_method
                             WHERE billing_customer_id = ? AND status IN ('ACTIVE', 'SUSPENDED')
                             FOR UPDATE
                            """,
                            (resultSet, rowNum) ->
                                    new PaymentMethodSecret(
                                            resultSet.getLong(1), resultSet.getString(2)),
                            customer.id());
            LocalDateTime now = LocalDateTime.now();
            GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(
                    connection -> {
                        PreparedStatement statement =
                                connection.prepareStatement(
                                        """
                                        INSERT INTO billing_payment_method
                                          (billing_customer_id, provider, secret_reference,
                                           provider_method_key_hash, method_type, issuer_code,
                                           masked_number, status, owner_confirmed_at, activated_at,
                                           created_at, updated_at)
                                        VALUES (?, 'TOSS', ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)
                                        """,
                                        Statement.RETURN_GENERATED_KEYS);
                        statement.setLong(1, customer.id());
                        statement.setString(2, reference);
                        statement.setString(3, BillingHash.sha256(method.billingKey()));
                        statement.setString(4, method.methodType());
                        statement.setString(5, method.issuerCode());
                        statement.setString(6, method.maskedNumber());
                        statement.setTimestamp(7, Timestamp.valueOf(now));
                        statement.setTimestamp(8, Timestamp.valueOf(now));
                        statement.setTimestamp(9, Timestamp.valueOf(now));
                        statement.setTimestamp(10, Timestamp.valueOf(now));
                        return statement;
                    },
                    keyHolder);
            Long methodId = keyHolder.getKey().longValue();
            jdbcTemplate.update(
                    """
                    UPDATE billing_payment_method
                       SET status = 'REVOKED', revoked_at = ?, updated_at = ?
                     WHERE billing_customer_id = ? AND status IN ('ACTIVE', 'SUSPENDED') AND id <> ?
                    """,
                    now,
                    now,
                    customer.id(),
                    methodId);
            jdbcTemplate.update(
                    """
                    UPDATE workspace_subscription
                       SET payment_method_id = ?, updated_at = ?, version = version + 1
                     WHERE workspace_id = ?
                    """,
                    methodId,
                    now,
                    customer.workspaceId());
            afterCommit(
                    () ->
                            oldMethods.forEach(
                                    methodSecret -> safeRevoke(methodSecret.secretReference())));
            return methodId;
        } catch (RuntimeException exception) {
            safeRevoke(reference);
            throw exception;
        }
    }

    @Transactional
    public Charge createCharge(
            Long workspaceId,
            Long actorUserId,
            String chargeType,
            String productCode,
            String billingCycle,
            int pointsToGrant,
            int amountKrw,
            String idempotencyKey,
            String periodKey) {
        List<Charge> existing = chargeByIdempotency(idempotencyKey);
        if (!existing.isEmpty()) {
            Charge charge = existing.get(0);
            if (!charge.workspaceId().equals(workspaceId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "결제 요청 키가 충돌했습니다.");
            }
            return charge;
        }
        UUID publicId = UUID.randomUUID();
        String orderId = "si_" + publicId.toString().replace("-", "");
        Long subscriptionId =
                jdbcTemplate.queryForObject(
                        "SELECT id FROM workspace_subscription WHERE workspace_id = ?",
                        Long.class,
                        workspaceId);
        try {
            jdbcTemplate.update(
                    """
                INSERT INTO billing_charge
                  (public_id, workspace_id, subscription_id, charge_type, product_code,
                   billing_cycle, quantity, points_to_grant, amount_krw, order_id,
                   idempotency_key, period_key, status, retry_count, requested_by_user_id,
                   requested_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 'PENDING', 0, ?,
                        CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6))
                """,
                    uuidBytes(publicId),
                    workspaceId,
                    subscriptionId,
                    chargeType,
                    productCode,
                    billingCycle,
                    pointsToGrant,
                    amountKrw,
                    orderId,
                    idempotencyKey,
                    periodKey,
                    actorUserId);
        } catch (DuplicateKeyException ignored) {
            // A concurrent retry created the same idempotent charge. Re-read below.
        }
        return chargeByIdempotency(idempotencyKey).get(0);
    }

    @Transactional
    public void markProcessing(Long chargeId) {
        jdbcTemplate.update(
                """
                UPDATE billing_charge
                   SET status = 'PROCESSING', updated_at = CURRENT_TIMESTAMP(6)
                 WHERE id = ? AND status = 'PENDING'
                """,
                chargeId);
    }

    @Transactional
    public void markReconciliationRequired(Long chargeId, String failureCode) {
        jdbcTemplate.update(
                """
                UPDATE billing_charge
                   SET status = 'RECONCILIATION_REQUIRED', failure_code = ?,
                       updated_at = CURRENT_TIMESTAMP(6)
                 WHERE id = ? AND status IN ('PENDING', 'PROCESSING')
                """,
                failureCode,
                chargeId);
    }

    @Transactional
    public Charge approve(Long chargeId, BillingProviderPort.ApprovedPayment payment) {
        Charge charge = chargeForUpdate(chargeId);
        if (charge.status().equals("APPROVED")) {
            return charge;
        }
        if (!charge.orderId().equals(payment.orderId())
                || charge.amountKrw() != payment.totalAmountKrw()
                || !payment.status().equals("DONE")) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "결제 승인 검증에 실패했습니다.");
        }
        String paymentReference =
                secretProvider.store(
                        "billing/workspaces/" + charge.workspaceId() + "/payments",
                        payment.paymentKey());
        try {
            jdbcTemplate.update(
                    """
                    INSERT INTO billing_payment
                      (billing_charge_id, provider, provider_payment_key_hash,
                       provider_payment_reference, provider_transaction_key, payment_method,
                       status, approved_amount_krw, canceled_amount_krw, approved_at,
                       created_at, updated_at)
                    VALUES (?, 'TOSS', ?, ?, ?, ?, 'APPROVED', ?, 0, ?,
                            CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6))
                    """,
                    charge.id(),
                    BillingHash.sha256(payment.paymentKey()),
                    paymentReference,
                    payment.transactionKey(),
                    payment.method(),
                    payment.totalAmountKrw(),
                    payment.approvedAt());
            jdbcTemplate.update(
                    """
                    UPDATE billing_charge
                       SET status = 'APPROVED', approved_at = CURRENT_TIMESTAMP(6),
                           failure_code = NULL, updated_at = CURRENT_TIMESTAMP(6)
                     WHERE id = ?
                    """,
                    charge.id());
            if (charge.chargeType().equals("POINT_PACK")) {
                jdbcTemplate.update(
                        """
                        INSERT INTO ai_point_ledger
                          (workspace_id, ai_usage_id, entry_type, bucket_type, points,
                           idempotency_key, expires_at, created_at)
                        VALUES (?, NULL, 'PURCHASE', 'PURCHASED', ?, ?, NULL, CURRENT_TIMESTAMP(6))
                        """,
                        charge.workspaceId(),
                        charge.pointsToGrant(),
                        "charge:" + charge.id() + ":point-grant");
            } else if (charge.chargeType().equals("SUBSCRIPTION")
                    || charge.chargeType().equals("SUBSCRIPTION_RENEWAL")) {
                activateSubscription(charge);
            } else if (charge.chargeType().equals("SEAT_ADDON")) {
                addSeat(charge);
            }
            return chargeForUpdate(charge.id());
        } catch (RuntimeException exception) {
            safeRevoke(paymentReference);
            throw exception;
        }
    }

    public PaymentMethod paymentMethod(Long workspaceId) {
        return jdbcTemplate
                .query(
                        """
                        SELECT pm.id, bc.provider_customer_key, pm.secret_reference,
                               pm.method_type, pm.issuer_code, pm.masked_number
                          FROM billing_customer bc
                          JOIN billing_payment_method pm ON pm.billing_customer_id = bc.id
                         WHERE bc.workspace_id = ? AND bc.status = 'ACTIVE' AND pm.status = 'ACTIVE'
                         ORDER BY pm.id DESC
                         LIMIT 1
                        """,
                        (resultSet, rowNum) ->
                                new PaymentMethod(
                                        resultSet.getLong(1),
                                        resultSet.getString(2),
                                        resultSet.getString(3),
                                        resultSet.getString(4),
                                        resultSet.getString(5),
                                        resultSet.getString(6)),
                        workspaceId)
                .stream()
                .findFirst()
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.CONFLICT, "먼저 결제수단을 등록해 주세요."));
    }

    public String resolvePaymentMethodSecret(PaymentMethod method) {
        return secretProvider.resolve(method.secretReference());
    }

    public List<Charge> reconciliationCandidates(int limit) {
        int boundedLimit = Math.max(1, Math.min(limit, 100));
        return jdbcTemplate.query(
                """
                SELECT id, workspace_id, charge_type, product_code, billing_cycle,
                       points_to_grant, amount_krw, order_id, idempotency_key, status
                  FROM billing_charge
                 WHERE status = 'RECONCILIATION_REQUIRED'
                 ORDER BY updated_at ASC, id ASC
                 LIMIT ?
                """,
                (resultSet, rowNum) -> mapCharge(resultSet),
                boundedLimit);
    }

    public Charge chargeByOrderId(String orderId) {
        return jdbcTemplate
                .query(
                        """
                        SELECT id, workspace_id, charge_type, product_code, billing_cycle,
                               points_to_grant, amount_krw, order_id, idempotency_key, status
                          FROM billing_charge
                         WHERE order_id = ?
                        """,
                        (resultSet, rowNum) -> mapCharge(resultSet),
                        orderId)
                .stream()
                .findFirst()
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND, "결제 주문을 찾을 수 없습니다."));
    }

    @Transactional
    public boolean receiveWebhook(
            String eventKey, String eventType, String paymentKeyHash, String payloadHash) {
        try {
            return jdbcTemplate.update(
                            """
                            INSERT INTO billing_webhook_event
                              (provider, event_key, event_type, provider_payment_key_hash,
                               payload_hash, status, received_at)
                            VALUES ('TOSS', ?, ?, ?, ?, 'RECEIVED', CURRENT_TIMESTAMP(6))
                            """,
                            eventKey,
                            eventType,
                            paymentKeyHash,
                            payloadHash)
                    == 1;
        } catch (DuplicateKeyException ignored) {
            return jdbcTemplate.update(
                            """
                            UPDATE billing_webhook_event
                               SET status = 'RECEIVED', failure_code = NULL,
                                   received_at = CURRENT_TIMESTAMP(6)
                             WHERE provider = 'TOSS' AND event_key = ?
                               AND status = 'RETRY_REQUIRED'
                            """,
                            eventKey)
                    == 1;
        }
    }

    @Transactional
    public void completeWebhook(String eventKey) {
        jdbcTemplate.update(
                """
                UPDATE billing_webhook_event
                   SET status = 'PROCESSED', processed_at = CURRENT_TIMESTAMP(6), failure_code = NULL
                 WHERE provider = 'TOSS' AND event_key = ?
                """,
                eventKey);
    }

    @Transactional
    public void failWebhook(String eventKey, String failureCode) {
        jdbcTemplate.update(
                """
                UPDATE billing_webhook_event
                   SET status = 'RETRY_REQUIRED', failure_code = ?
                 WHERE provider = 'TOSS' AND event_key = ? AND status <> 'PROCESSED'
                """,
                failureCode,
                eventKey);
    }

    @Transactional
    public void reportCancellation(Charge charge, BillingProviderPort.ApprovedPayment payment) {
        jdbcTemplate.update(
                """
                UPDATE billing_payment
                   SET status = ?, canceled_amount_krw = ?, canceled_at = CURRENT_TIMESTAMP(6),
                       updated_at = CURRENT_TIMESTAMP(6)
                 WHERE billing_charge_id = ? AND provider = 'TOSS'
                """,
                payment.status(),
                payment.canceledAmountKrw(),
                charge.id());
        jdbcTemplate.update(
                """
                UPDATE billing_charge
                   SET status = 'CANCELLATION_REVIEW_REQUIRED', updated_at = CURRENT_TIMESTAMP(6)
                 WHERE id = ?
                """,
                charge.id());
    }

    @Transactional
    public List<RenewalCandidate> claimDueRenewals(int limit) {
        int boundedLimit = Math.max(1, Math.min(limit, 25));
        List<RenewalCandidate> candidates =
                jdbcTemplate.query(
                        """
                        SELECT s.id, s.workspace_id, s.plan_code, s.billing_cycle,
                               CASE WHEN s.billing_cycle = 'ANNUAL'
                                    THEN s.price_annual_krw ELSE s.price_monthly_krw END,
                               s.current_period_end
                          FROM workspace_subscription s
                         WHERE s.status IN ('ACTIVE', 'PAST_DUE', 'GRACE_PERIOD')
                           AND s.plan_code <> 'FREE' AND s.cancel_at_period_end = 0
                           AND s.current_period_end <= CURRENT_TIMESTAMP(6)
                           AND (s.renewal_lease_until IS NULL
                                OR s.renewal_lease_until < CURRENT_TIMESTAMP(6))
                         ORDER BY s.current_period_end ASC, s.id ASC
                         LIMIT ?
                         FOR UPDATE
                        """,
                        (resultSet, rowNum) ->
                                new RenewalCandidate(
                                        resultSet.getLong(1),
                                        resultSet.getLong(2),
                                        resultSet.getString(3),
                                        resultSet.getString(4),
                                        resultSet.getInt(5),
                                        resultSet.getTimestamp(6).toLocalDateTime()),
                        boundedLimit);
        LocalDateTime leaseUntil = LocalDateTime.now().plusMinutes(10);
        candidates.forEach(
                candidate ->
                        jdbcTemplate.update(
                                """
                                UPDATE workspace_subscription
                                   SET renewal_lease_until = ?, updated_at = CURRENT_TIMESTAMP(6)
                                 WHERE id = ?
                                """,
                                leaseUntil,
                                candidate.subscriptionId()));
        return candidates;
    }

    @Transactional
    public void markRenewalAttemptFailed(Long subscriptionId) {
        jdbcTemplate.update(
                """
                UPDATE workspace_subscription
                   SET renewal_failure_count = LEAST(renewal_failure_count + 1, 3),
                       status = CASE
                         WHEN renewal_failure_count + 1 >= 3 THEN 'GRACE_PERIOD'
                         ELSE 'PAST_DUE'
                       END,
                       grace_period_ends_at = COALESCE(
                         grace_period_ends_at, DATE_ADD(CURRENT_TIMESTAMP(6), INTERVAL 7 DAY)),
                       renewal_lease_until = NULL, updated_at = CURRENT_TIMESTAMP(6),
                       version = version + 1
                 WHERE id = ?
                """,
                subscriptionId);
    }

    @Transactional
    public void releaseRenewalLease(Long subscriptionId) {
        jdbcTemplate.update(
                """
                UPDATE workspace_subscription
                   SET renewal_lease_until = NULL, updated_at = CURRENT_TIMESTAMP(6)
                 WHERE id = ?
                """,
                subscriptionId);
    }

    @Transactional
    public void downgradeExpiredGracePeriods() {
        jdbcTemplate.update(
                """
                UPDATE workspace_subscription
                   SET plan_code = 'FREE', price_monthly_krw = 0, price_annual_krw = 0,
                       status = 'CANCELED', billing_cycle = NULL, payment_method_id = NULL,
                       cancel_at_period_end = 0, renewal_failure_count = 0,
                       renewal_lease_until = NULL, updated_at = CURRENT_TIMESTAMP(6),
                       version = version + 1
                 WHERE status = 'GRACE_PERIOD' AND grace_period_ends_at <= CURRENT_TIMESTAMP(6)
                """);
        jdbcTemplate.update(
                """
                UPDATE workspace_subscription
                   SET plan_code = 'FREE', price_monthly_krw = 0, price_annual_krw = 0,
                       status = 'CANCELED', billing_cycle = NULL, payment_method_id = NULL,
                       renewal_failure_count = 0, renewal_lease_until = NULL,
                       updated_at = CURRENT_TIMESTAMP(6), version = version + 1
                 WHERE status = 'CANCEL_AT_PERIOD_END'
                   AND current_period_end <= CURRENT_TIMESTAMP(6)
                """);
    }

    public SeatQuote seatQuote(Long workspaceId) {
        return jdbcTemplate
                .query(
                        """
                        SELECT s.id, s.billing_cycle, s.current_period_start, s.current_period_end,
                               s.plan_code
                          FROM workspace_subscription s
                         WHERE s.workspace_id = ? AND s.status = 'ACTIVE'
                           AND s.plan_code IN ('PERSONAL_PRO', 'BUSINESS')
                        """,
                        (resultSet, rowNum) -> {
                            LocalDateTime start = resultSet.getTimestamp(3).toLocalDateTime();
                            LocalDateTime end = resultSet.getTimestamp(4).toLocalDateTime();
                            LocalDateTime now = LocalDateTime.now();
                            long periodSeconds =
                                    Math.max(1, Duration.between(start, end).toSeconds());
                            long remainingSeconds =
                                    Math.max(1, Duration.between(now, end).toSeconds());
                            String cycle = resultSet.getString(2);
                            int unitPrice = cycle.equals("ANNUAL") ? 30_000 : 3_000;
                            int prorated =
                                    Math.max(
                                            100,
                                            (int)
                                                    Math.ceil(
                                                            (double) unitPrice
                                                                    * remainingSeconds
                                                                    / periodSeconds));
                            return new SeatQuote(cycle, end, prorated);
                        },
                        workspaceId)
                .stream()
                .findFirst()
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "유료 구독이 활성화된 Workspace만 좌석을 추가할 수 있습니다."));
    }

    @Transactional
    public void scheduleCancellation(Long workspaceId) {
        int updated =
                jdbcTemplate.update(
                        """
                        UPDATE workspace_subscription
                           SET status = 'CANCEL_AT_PERIOD_END', cancel_at_period_end = 1,
                               updated_at = CURRENT_TIMESTAMP(6), version = version + 1
                         WHERE workspace_id = ? AND status = 'ACTIVE' AND plan_code <> 'FREE'
                        """,
                        workspaceId);
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "해지 예약할 유료 구독이 없습니다.");
        }
    }

    @Transactional
    public void resumeSubscription(Long workspaceId) {
        int updated =
                jdbcTemplate.update(
                        """
                        UPDATE workspace_subscription
                           SET status = 'ACTIVE', cancel_at_period_end = 0,
                               updated_at = CURRENT_TIMESTAMP(6), version = version + 1
                         WHERE workspace_id = ? AND status = 'CANCEL_AT_PERIOD_END'
                           AND current_period_end > CURRENT_TIMESTAMP(6)
                        """,
                        workspaceId);
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "복구할 구독 해지 예약이 없습니다.");
        }
    }

    private void activateSubscription(Charge charge) {
        LocalDateTime start = LocalDateTime.now();
        if (charge.chargeType().equals("SUBSCRIPTION_RENEWAL")) {
            LocalDateTime currentPeriodEnd =
                    jdbcTemplate.queryForObject(
                            "SELECT current_period_end FROM workspace_subscription WHERE workspace_id = ?",
                            (resultSet, rowNum) -> resultSet.getTimestamp(1).toLocalDateTime(),
                            charge.workspaceId());
            if (currentPeriodEnd != null) {
                start = currentPeriodEnd;
            }
        }
        LocalDateTime end =
                charge.billingCycle().equals("ANNUAL") ? start.plusYears(1) : start.plusMonths(1);
        jdbcTemplate.update(
                """
                UPDATE workspace_subscription s
                JOIN billing_plan p ON p.code = ?
                   SET s.plan_code = p.code,
                       s.price_monthly_krw = p.monthly_price_krw,
                       s.price_annual_krw = p.annual_price_krw,
                       s.status = 'ACTIVE', s.billing_cycle = ?,
                       s.current_period_start = ?, s.current_period_end = ?,
                       s.cancel_at_period_end = 0, s.grace_period_ends_at = NULL,
                       s.renewal_failure_count = 0, s.updated_at = CURRENT_TIMESTAMP(6),
                       s.renewal_lease_until = NULL,
                       s.version = s.version + 1
                 WHERE s.workspace_id = ?
                """,
                charge.productCode(),
                charge.billingCycle(),
                start,
                end,
                charge.workspaceId());
        Integer includedPoints =
                jdbcTemplate.queryForObject(
                        "SELECT included_ai_points FROM billing_plan WHERE code = ?",
                        Integer.class,
                        charge.productCode());
        if (includedPoints != null && includedPoints > 0) {
            LocalDate benefitMonth = LocalDate.now().withDayOfMonth(1);
            jdbcTemplate.update(
                    """
                    INSERT IGNORE INTO ai_point_ledger
                      (workspace_id, ai_usage_id, entry_type, bucket_type, points,
                       idempotency_key, expires_at, created_at)
                    VALUES (?, NULL, 'MONTHLY_GRANT', 'INCLUDED', ?, ?, ?, CURRENT_TIMESTAMP(6))
                    """,
                    charge.workspaceId(),
                    includedPoints,
                    "MONTHLY_GRANT:"
                            + charge.workspaceId()
                            + ":"
                            + charge.productCode()
                            + ":"
                            + benefitMonth,
                    benefitMonth.plusMonths(1).atStartOfDay());
        }
    }

    private void addSeat(Charge charge) {
        jdbcTemplate.update(
                """
                INSERT INTO subscription_seat_addon
                  (subscription_id, quantity, pending_removal_quantity,
                   unit_monthly_price_krw, unit_annual_price_krw, effective_at,
                   next_renewal_at, version, created_at, updated_at)
                SELECT s.id, 1, 0, 3000, 30000, CURRENT_TIMESTAMP(6),
                       s.current_period_end, 0, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
                  FROM workspace_subscription s
                 WHERE s.workspace_id = ?
                ON DUPLICATE KEY UPDATE
                  quantity = quantity + 1,
                  next_renewal_at = VALUES(next_renewal_at),
                  version = version + 1,
                  updated_at = CURRENT_TIMESTAMP(6)
                """,
                charge.workspaceId());
    }

    private List<BillingCustomer> customer(Long workspaceId) {
        return jdbcTemplate.query(
                """
                SELECT id, workspace_id, provider_customer_key
                  FROM billing_customer
                 WHERE workspace_id = ? AND provider = 'TOSS'
                """,
                (resultSet, rowNum) ->
                        new BillingCustomer(
                                resultSet.getLong(1), resultSet.getLong(2), resultSet.getString(3)),
                workspaceId);
    }

    private List<Charge> chargeByIdempotency(String idempotencyKey) {
        return jdbcTemplate.query(
                """
                SELECT id, workspace_id, charge_type, product_code, billing_cycle,
                       points_to_grant, amount_krw, order_id, idempotency_key, status
                  FROM billing_charge
                 WHERE idempotency_key = ?
                """,
                (resultSet, rowNum) -> mapCharge(resultSet),
                idempotencyKey);
    }

    private Charge chargeForUpdate(Long chargeId) {
        return jdbcTemplate
                .query(
                        """
                        SELECT id, workspace_id, charge_type, product_code, billing_cycle,
                               points_to_grant, amount_krw, order_id, idempotency_key, status
                          FROM billing_charge
                         WHERE id = ?
                         FOR UPDATE
                        """,
                        (resultSet, rowNum) -> mapCharge(resultSet),
                        chargeId)
                .stream()
                .findFirst()
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND, "결제 요청을 찾을 수 없습니다."));
    }

    private static Charge mapCharge(ResultSet resultSet) throws SQLException {
        return new Charge(
                resultSet.getLong(1),
                resultSet.getLong(2),
                resultSet.getString(3),
                resultSet.getString(4),
                resultSet.getString(5),
                resultSet.getInt(6),
                resultSet.getInt(7),
                resultSet.getString(8),
                resultSet.getString(9),
                resultSet.getString(10));
    }

    private void safeRevoke(String reference) {
        try {
            secretProvider.revoke(reference);
        } catch (RuntimeException ignored) {
            // A dangling secret is safer than logging secret context or hiding the primary failure.
        }
    }

    private static void afterCommit(Runnable action) {
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        action.run();
                    }
                });
    }

    private static byte[] uuidBytes(UUID uuid) {
        ByteBuffer buffer = ByteBuffer.allocate(16);
        buffer.putLong(uuid.getMostSignificantBits());
        buffer.putLong(uuid.getLeastSignificantBits());
        return buffer.array();
    }

    public record BillingCustomer(Long id, Long workspaceId, String customerKey) {}

    public record PaymentMethod(
            Long id,
            String customerKey,
            String secretReference,
            String methodType,
            String issuerCode,
            String maskedNumber) {}

    public record Charge(
            Long id,
            Long workspaceId,
            String chargeType,
            String productCode,
            String billingCycle,
            int pointsToGrant,
            int amountKrw,
            String orderId,
            String idempotencyKey,
            String status) {}

    public record SeatQuote(String billingCycle, LocalDateTime periodEnd, int amountKrw) {}

    public record RenewalCandidate(
            Long subscriptionId,
            Long workspaceId,
            String planCode,
            String billingCycle,
            int amountKrw,
            LocalDateTime periodEnd) {}

    private record PaymentMethodSecret(Long id, String secretReference) {}
}
