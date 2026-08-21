package com.selfintro.modules.billing.application;

import com.selfintro.modules.billing.application.BillingStateStore.Charge;
import com.selfintro.modules.billing.application.BillingStateStore.PaymentMethod;
import com.selfintro.modules.billing.application.BillingStateStore.RenewalCandidate;
import java.time.format.DateTimeFormatter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SubscriptionRenewalService {

    private final BillingStateStore stateStore;
    private final BillingProviderPort billingProvider;

    @Value("${app.billing.renewal-enabled:false}")
    private boolean renewalEnabled;

    @Scheduled(
            cron = "${app.billing.renewal-cron:0 */10 * * * *}",
            zone = "${app.billing.time-zone:Asia/Seoul}")
    public void renewDueSubscriptions() {
        if (!renewalEnabled) {
            return;
        }
        stateStore.downgradeExpiredGracePeriods();
        for (RenewalCandidate renewal : stateStore.claimDueRenewals(10)) {
            renew(renewal);
        }
    }

    private void renew(RenewalCandidate renewal) {
        String periodKey = renewal.periodEnd().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        String idempotencyKey =
                "renewal_"
                        + renewal.subscriptionId()
                        + "_"
                        + BillingHash.sha256(periodKey).substring(0, 24);
        Charge charge =
                stateStore.createCharge(
                        renewal.workspaceId(),
                        null,
                        "SUBSCRIPTION_RENEWAL",
                        renewal.planCode(),
                        renewal.billingCycle(),
                        0,
                        renewal.amountKrw(),
                        idempotencyKey,
                        periodKey);
        if (charge.status().equals("APPROVED")) {
            stateStore.releaseRenewalLease(renewal.subscriptionId());
            return;
        }
        if (!charge.status().equals("PENDING")) {
            stateStore.releaseRenewalLease(renewal.subscriptionId());
            return;
        }
        try {
            PaymentMethod method = stateStore.paymentMethod(renewal.workspaceId());
            stateStore.markProcessing(charge.id());
            BillingProviderPort.ApprovedPayment payment =
                    billingProvider.charge(
                            new BillingProviderPort.ChargeCommand(
                                    stateStore.resolvePaymentMethodSecret(method),
                                    method.customerKey(),
                                    charge.orderId(),
                                    renewal.planCode() + " 구독 갱신",
                                    charge.amountKrw(),
                                    charge.idempotencyKey()));
            stateStore.approve(charge.id(), payment);
        } catch (RuntimeException exception) {
            stateStore.markReconciliationRequired(charge.id(), "RENEWAL_PROVIDER_RESULT_UNKNOWN");
            stateStore.markRenewalAttemptFailed(renewal.subscriptionId());
        } finally {
            stateStore.releaseRenewalLease(renewal.subscriptionId());
        }
    }
}
