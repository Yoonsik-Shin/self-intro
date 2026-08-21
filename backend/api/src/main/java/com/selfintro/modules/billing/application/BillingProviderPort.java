package com.selfintro.modules.billing.application;

import java.time.LocalDateTime;

public interface BillingProviderPort {

    RegisteredMethod issueBillingMethod(String authKey, String customerKey);

    ApprovedPayment charge(ChargeCommand command);

    ApprovedPayment query(String providerPaymentReference);

    ApprovedPayment queryOrder(String orderId);

    ApprovedPayment cancel(CancelCommand command);

    void revokeBillingMethod(String billingKey);

    record RegisteredMethod(
            String billingKey,
            String customerKey,
            String methodType,
            String issuerCode,
            String maskedNumber) {}

    record ChargeCommand(
            String billingKey,
            String customerKey,
            String orderId,
            String orderName,
            int amountKrw,
            String idempotencyKey) {}

    record CancelCommand(String paymentKey, int amountKrw, String reason, String idempotencyKey) {}

    record ApprovedPayment(
            String paymentKey,
            String orderId,
            String transactionKey,
            String method,
            String status,
            int totalAmountKrw,
            int canceledAmountKrw,
            LocalDateTime approvedAt) {}
}
