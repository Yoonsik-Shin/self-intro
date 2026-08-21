package com.selfintro.modules.billing.application;

import com.selfintro.modules.aiusage.application.AiUsageLedgerService;
import com.selfintro.modules.billing.application.BillingStateStore.BillingCustomer;
import com.selfintro.modules.billing.application.BillingStateStore.Charge;
import com.selfintro.modules.billing.application.BillingStateStore.PaymentMethod;
import com.selfintro.modules.billing.application.BillingStateStore.SeatQuote;
import com.selfintro.modules.billing.presentation.dto.BillingChargeResponse;
import com.selfintro.modules.billing.presentation.dto.BillingCheckoutContextResponse;
import com.selfintro.modules.billing.presentation.dto.BillingPaymentMethodResponse;
import com.selfintro.modules.identity.application.PlatformOwnerPreviewPolicy;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class WorkspaceBillingMutationService {

    private final BillingStateStore stateStore;
    private final BillingProviderPort billingProvider;
    private final SecurityAuditService auditService;
    private final AiUsageLedgerService usageLedgerService;
    private final PlatformOwnerPreviewPolicy previewPolicy;

    @Value("${app.billing.enabled:false}")
    private boolean billingEnabled;

    @Value("${app.billing.toss.client-key:}")
    private String tossClientKey;

    public BillingCheckoutContextResponse checkoutContext(WorkspaceMember actor) {
        requireOwnerAndMfa(actor);
        ensureWorkspaceDefaults(actor);
        BillingCustomer customer = stateStore.ensureCustomer(actor.getWorkspace().getId());
        return new BillingCheckoutContextResponse(
                isEnabledFor(actor), "TOSS", tossClientKey, customer.customerKey());
    }

    public BillingPaymentMethodResponse registerPaymentMethod(
            WorkspaceMember actor, String authKey, String customerKey) {
        requireEnabled(actor);
        requireOwnerAndMfa(actor);
        ensureWorkspaceDefaults(actor);
        BillingCustomer customer = stateStore.ensureCustomer(actor.getWorkspace().getId());
        if (!customer.customerKey().equals(customerKey)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결제 고객 정보가 일치하지 않습니다.");
        }
        BillingProviderPort.RegisteredMethod registered =
                billingProvider.issueBillingMethod(authKey, customerKey);
        try {
            Long methodId =
                    stateStore.replacePaymentMethod(customer, actor.getUser().getId(), registered);
            auditService.recordWorkspaceTargetAction(
                    "BILLING_PAYMENT_METHOD_CHANGED",
                    actor.getUser().getId(),
                    actor.getWorkspace().getId(),
                    "BILLING_PAYMENT_METHOD",
                    methodId);
            return new BillingPaymentMethodResponse(
                    methodId,
                    registered.methodType(),
                    registered.issuerCode(),
                    registered.maskedNumber(),
                    "ACTIVE");
        } catch (RuntimeException exception) {
            try {
                billingProvider.revokeBillingMethod(registered.billingKey());
            } catch (RuntimeException ignored) {
                // Preserve the primary failure and never log provider secret material.
            }
            throw exception;
        }
    }

    public BillingChargeResponse purchaseSubscription(
            WorkspaceMember actor, String planCode, String billingCycle, String idempotencyKey) {
        requireEnabled(actor);
        requireOwnerAndMfa(actor);
        ensureWorkspaceDefaults(actor);
        String normalizedPlan = planCode.toUpperCase(Locale.ROOT);
        String normalizedCycle = billingCycle.toUpperCase(Locale.ROOT);
        int amount = subscriptionAmount(normalizedPlan, normalizedCycle);
        Charge charge =
                stateStore.createCharge(
                        actor.getWorkspace().getId(),
                        actor.getUser().getId(),
                        "SUBSCRIPTION",
                        normalizedPlan,
                        normalizedCycle,
                        0,
                        amount,
                        idempotencyKey,
                        null);
        return execute(actor, charge, normalizedPlan + " " + normalizedCycle + " 구독");
    }

    public BillingChargeResponse purchasePointPack(WorkspaceMember actor, String idempotencyKey) {
        requireEnabled(actor);
        requireOwnerAndMfa(actor);
        ensureWorkspaceDefaults(actor);
        Charge charge =
                stateStore.createCharge(
                        actor.getWorkspace().getId(),
                        actor.getUser().getId(),
                        "POINT_PACK",
                        "AI_POINTS_10000",
                        null,
                        10_000,
                        9_900,
                        idempotencyKey,
                        null);
        return execute(actor, charge, "AI 포인트 10,000");
    }

    public BillingChargeResponse purchaseSeat(WorkspaceMember actor, String idempotencyKey) {
        requireEnabled(actor);
        requireOwnerAndMfa(actor);
        ensureWorkspaceDefaults(actor);
        SeatQuote quote = stateStore.seatQuote(actor.getWorkspace().getId());
        Charge charge =
                stateStore.createCharge(
                        actor.getWorkspace().getId(),
                        actor.getUser().getId(),
                        "SEAT_ADDON",
                        "ADDITIONAL_SEAT",
                        quote.billingCycle(),
                        0,
                        quote.amountKrw(),
                        idempotencyKey,
                        null);
        return execute(actor, charge, "추가 좌석 1개");
    }

    public void cancelSubscription(WorkspaceMember actor) {
        requireEnabled(actor);
        requireOwnerAndMfa(actor);
        stateStore.scheduleCancellation(actor.getWorkspace().getId());
        auditService.recordWorkspaceAction(
                "BILLING_SUBSCRIPTION_CANCEL_SCHEDULED",
                actor.getUser().getId(),
                actor.getWorkspace().getId());
    }

    public void resumeSubscription(WorkspaceMember actor) {
        requireEnabled(actor);
        requireOwnerAndMfa(actor);
        stateStore.resumeSubscription(actor.getWorkspace().getId());
        auditService.recordWorkspaceAction(
                "BILLING_SUBSCRIPTION_RESUMED",
                actor.getUser().getId(),
                actor.getWorkspace().getId());
    }

    private BillingChargeResponse execute(WorkspaceMember actor, Charge charge, String orderName) {
        if (charge.status().equals("APPROVED")) {
            return BillingChargeResponse.from(charge);
        }
        if (!charge.status().equals("PENDING")) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "결제 상태를 확인 중입니다. 잠시 후 다시 조회해 주세요.");
        }
        PaymentMethod paymentMethod = stateStore.paymentMethod(actor.getWorkspace().getId());
        stateStore.markProcessing(charge.id());
        try {
            BillingProviderPort.ApprovedPayment payment =
                    billingProvider.charge(
                            new BillingProviderPort.ChargeCommand(
                                    stateStore.resolvePaymentMethodSecret(paymentMethod),
                                    paymentMethod.customerKey(),
                                    charge.orderId(),
                                    orderName,
                                    charge.amountKrw(),
                                    charge.idempotencyKey()));
            Charge approved = stateStore.approve(charge.id(), payment);
            auditService.recordWorkspaceTargetAction(
                    "BILLING_CHARGE_APPROVED",
                    actor.getUser().getId(),
                    actor.getWorkspace().getId(),
                    "BILLING_CHARGE",
                    charge.id());
            return BillingChargeResponse.from(approved);
        } catch (RuntimeException exception) {
            stateStore.markReconciliationRequired(charge.id(), "PROVIDER_RESULT_UNKNOWN");
            throw exception;
        }
    }

    private void requireOwnerAndMfa(WorkspaceMember actor) {
        if (actor.getRole() != WorkspaceRole.OWNER) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "리소스를 찾을 수 없습니다.");
        }
        if (!actor.getUser().isMfaEnabled()) {
            throw new ResponseStatusException(
                    HttpStatus.PRECONDITION_REQUIRED, "결제 관리 전에 MFA를 등록해 주세요.");
        }
    }

    private void ensureWorkspaceDefaults(WorkspaceMember actor) {
        usageLedgerService.ensureWorkspaceDefaults(actor.getWorkspace().getId());
    }

    private void requireEnabled(WorkspaceMember actor) {
        if (!isEnabledFor(actor)) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "결제 기능은 아직 활성화되지 않았습니다.");
        }
    }

    private boolean isEnabledFor(WorkspaceMember actor) {
        return billingEnabled
                || previewPolicy.isAllowed(actor.getUser().getId(), actor.getWorkspace().getId());
    }

    private static int subscriptionAmount(String planCode, String billingCycle) {
        return switch (planCode + ":" + billingCycle) {
            case "PERSONAL_PRO:MONTHLY" -> 9_900;
            case "PERSONAL_PRO:ANNUAL" -> 99_000;
            case "BUSINESS:MONTHLY" -> 39_000;
            case "BUSINESS:ANNUAL" -> 390_000;
            default ->
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "지원하지 않는 플랜 또는 결제 주기입니다.");
        };
    }
}
