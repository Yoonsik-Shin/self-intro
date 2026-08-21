package com.selfintro.modules.billing.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.selfintro.modules.aiusage.application.AiUsageLedgerService;
import com.selfintro.modules.billing.application.BillingStateStore.Charge;
import com.selfintro.modules.billing.application.BillingStateStore.PaymentMethod;
import com.selfintro.modules.billing.presentation.dto.BillingChargeResponse;
import com.selfintro.modules.identity.domain.AppUser;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class WorkspaceBillingMutationServiceTest {

    @Mock private BillingStateStore stateStore;
    @Mock private BillingProviderPort provider;
    @Mock private SecurityAuditService auditService;
    @Mock private AiUsageLedgerService usageLedgerService;
    @Mock private WorkspaceMember actor;
    @Mock private Workspace workspace;
    @Mock private AppUser user;

    private WorkspaceBillingMutationService service;

    @BeforeEach
    void setUp() {
        service =
                new WorkspaceBillingMutationService(
                        stateStore, provider, auditService, usageLedgerService);
        ReflectionTestUtils.setField(service, "billingEnabled", true);
        when(actor.getRole()).thenReturn(WorkspaceRole.OWNER);
        when(actor.getWorkspace()).thenReturn(workspace);
        when(actor.getUser()).thenReturn(user);
        when(workspace.getId()).thenReturn(7L);
        when(user.getId()).thenReturn(11L);
        when(user.isMfaEnabled()).thenReturn(true);
    }

    @Test
    void proMonthlyUsesApprovedPriceAndIdempotentChargeBoundary() {
        Charge pending =
                new Charge(
                        31L,
                        7L,
                        "SUBSCRIPTION",
                        "PERSONAL_PRO",
                        "MONTHLY",
                        0,
                        9_900,
                        "si_order",
                        "request_key_123456",
                        "PENDING");
        Charge approved =
                new Charge(
                        31L,
                        7L,
                        "SUBSCRIPTION",
                        "PERSONAL_PRO",
                        "MONTHLY",
                        0,
                        9_900,
                        "si_order",
                        "request_key_123456",
                        "APPROVED");
        when(stateStore.createCharge(
                        7L,
                        11L,
                        "SUBSCRIPTION",
                        "PERSONAL_PRO",
                        "MONTHLY",
                        0,
                        9_900,
                        "request_key_123456",
                        null))
                .thenReturn(pending);
        when(stateStore.paymentMethod(7L))
                .thenReturn(
                        new PaymentMethod(3L, "ws_customer", "secret-ref", "CARD", "11", "1234"));
        when(stateStore.resolvePaymentMethodSecret(any())).thenReturn("billing-key");
        BillingProviderPort.ApprovedPayment payment =
                new BillingProviderPort.ApprovedPayment(
                        "payment-key",
                        "si_order",
                        "transaction-key",
                        "카드",
                        "DONE",
                        9_900,
                        0,
                        LocalDateTime.now());
        when(provider.charge(any())).thenReturn(payment);
        when(stateStore.approve(31L, payment)).thenReturn(approved);

        BillingChargeResponse response =
                service.purchaseSubscription(
                        actor, "PERSONAL_PRO", "MONTHLY", "request_key_123456");

        assertThat(response.amountKrw()).isEqualTo(9_900);
        assertThat(response.status()).isEqualTo("APPROVED");
        verify(provider)
                .charge(
                        argThat(
                                command ->
                                        command.amountKrw() == 9_900
                                                && command.orderId().equals("si_order")
                                                && command.idempotencyKey()
                                                        .equals("request_key_123456")));
    }

    @Test
    void pointPackGrantsOnlyAfterProviderApproval() {
        Charge pending =
                new Charge(
                        32L,
                        7L,
                        "POINT_PACK",
                        "AI_POINTS_10000",
                        null,
                        10_000,
                        9_900,
                        "si_points",
                        "point_key_12345678",
                        "PENDING");
        Charge approved =
                new Charge(
                        32L,
                        7L,
                        "POINT_PACK",
                        "AI_POINTS_10000",
                        null,
                        10_000,
                        9_900,
                        "si_points",
                        "point_key_12345678",
                        "APPROVED");
        when(stateStore.createCharge(
                        anyLong(),
                        anyLong(),
                        anyString(),
                        anyString(),
                        isNull(),
                        anyInt(),
                        anyInt(),
                        anyString(),
                        isNull()))
                .thenReturn(pending);
        when(stateStore.paymentMethod(7L))
                .thenReturn(
                        new PaymentMethod(3L, "ws_customer", "secret-ref", "CARD", "11", "1234"));
        when(stateStore.resolvePaymentMethodSecret(any())).thenReturn("billing-key");
        when(provider.charge(any()))
                .thenReturn(
                        new BillingProviderPort.ApprovedPayment(
                                "payment-key",
                                "si_points",
                                null,
                                "카드",
                                "DONE",
                                9_900,
                                0,
                                LocalDateTime.now()));
        when(stateStore.approve(eq(32L), any())).thenReturn(approved);

        BillingChargeResponse response = service.purchasePointPack(actor, "point_key_12345678");

        assertThat(response.points()).isEqualTo(10_000);
        assertThat(response.status()).isEqualTo("APPROVED");
    }
}
