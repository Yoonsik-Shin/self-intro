package com.selfintro.modules.billing.presentation.dto;

import com.selfintro.modules.billing.application.BillingStateStore.Charge;

public record BillingChargeResponse(
        Long id,
        String chargeType,
        String productCode,
        String billingCycle,
        int points,
        int amountKrw,
        String orderId,
        String status) {

    public static BillingChargeResponse from(Charge charge) {
        return new BillingChargeResponse(
                charge.id(),
                charge.chargeType(),
                charge.productCode(),
                charge.billingCycle(),
                charge.pointsToGrant(),
                charge.amountKrw(),
                charge.orderId(),
                charge.status());
    }
}
