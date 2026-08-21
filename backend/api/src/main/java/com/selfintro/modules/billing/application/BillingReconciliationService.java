package com.selfintro.modules.billing.application;

import com.selfintro.modules.billing.application.BillingStateStore.Charge;
import com.selfintro.modules.identity.application.PlatformOwnerPreviewPolicy;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BillingReconciliationService {

    private final BillingStateStore stateStore;
    private final BillingProviderPort billingProvider;
    private final PlatformOwnerPreviewPolicy previewPolicy;

    @Value("${app.billing.reconciliation-enabled:false}")
    private boolean reconciliationEnabled;

    @Scheduled(
            cron = "${app.billing.reconciliation-cron:0 */5 * * * *}",
            zone = "${app.billing.time-zone:Asia/Seoul}")
    public void reconcileUnknownCharges() {
        List<Long> previewWorkspaceIds = previewPolicy.allowedWorkspaceIds();
        if (!reconciliationEnabled && previewWorkspaceIds.isEmpty()) {
            return;
        }
        List<Charge> candidates =
                reconciliationEnabled
                        ? stateStore.reconciliationCandidates(25)
                        : stateStore.reconciliationCandidates(25, previewWorkspaceIds);
        for (Charge charge : candidates) {
            try {
                BillingProviderPort.ApprovedPayment payment =
                        billingProvider.queryOrder(charge.orderId());
                stateStore.approve(charge.id(), payment);
            } catch (RuntimeException ignored) {
                // Keep the charge in the inbox. Alerting uses counts/status, never provider bodies.
            }
        }
    }
}
