package com.selfintro.modules.billing.application;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.billing.application.BillingStateStore.Charge;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TossBillingWebhookServiceTest {

    @Mock private BillingStateStore stateStore;
    @Mock private BillingProviderPort provider;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void verifiesPaymentWithProviderBeforeApprovingCharge() throws Exception {
        TossBillingWebhookService service =
                new TossBillingWebhookService(objectMapper, stateStore, provider);
        when(stateStore.receiveWebhook(
                        anyString(), eq("PAYMENT_STATUS_CHANGED"), anyString(), anyString()))
                .thenReturn(true);
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
        when(provider.query("payment-key")).thenReturn(payment);
        Charge charge =
                new Charge(
                        9L,
                        7L,
                        "POINT_PACK",
                        "AI_POINTS_10000",
                        null,
                        10_000,
                        9_900,
                        "si_order",
                        "point_key_12345678",
                        "PROCESSING");
        when(stateStore.chargeByOrderId("si_order")).thenReturn(charge);

        service.receive(
                objectMapper.readTree(
                        """
                        {"eventType":"PAYMENT_STATUS_CHANGED","createdAt":"2026-08-21T10:00:00",
                         "data":{"paymentKey":"payment-key","orderId":"si_order","status":"DONE","requestedAt":"2026-08-21T09:59:00"}}
                        """));

        verify(provider).query("payment-key");
        verify(stateStore).approve(9L, payment);
        verify(stateStore).completeWebhook(anyString());
    }

    @Test
    void duplicateProcessedEventReturnsWithoutProviderCall() throws Exception {
        TossBillingWebhookService service =
                new TossBillingWebhookService(objectMapper, stateStore, provider);
        when(stateStore.receiveWebhook(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(false);

        service.receive(
                objectMapper.readTree(
                        """
                        {"eventType":"PAYMENT_STATUS_CHANGED","createdAt":"2026-08-21T10:00:00",
                         "data":{"paymentKey":"payment-key","orderId":"si_order","status":"DONE"}}
                        """));

        verifyNoInteractions(provider);
    }
}
