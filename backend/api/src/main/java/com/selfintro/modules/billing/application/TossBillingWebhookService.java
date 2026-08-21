package com.selfintro.modules.billing.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.billing.application.BillingStateStore.Charge;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class TossBillingWebhookService {

    private final ObjectMapper objectMapper;
    private final BillingStateStore stateStore;
    private final BillingProviderPort billingProvider;

    public void receive(JsonNode payload) {
        String eventType = text(payload, "eventType");
        JsonNode data = payload.path("data");
        String paymentKey = text(data, "paymentKey");
        String orderId = text(data, "orderId");
        String providerStatus = text(data, "status");
        String createdAt = data.path("requestedAt").asText(payload.path("createdAt").asText(""));
        String payloadHash = BillingHash.sha256(canonical(payload));
        String eventKey =
                BillingHash.sha256(
                        eventType + ":" + paymentKey + ":" + providerStatus + ":" + createdAt);
        if (!stateStore.receiveWebhook(
                eventKey, eventType, BillingHash.sha256(paymentKey), payloadHash)) {
            return;
        }
        try {
            // Reject random public webhook probes before making an outbound Provider request.
            // orderId is a 128-bit random internal identifier and is verified again below.
            Charge charge = stateStore.chargeByOrderId(orderId);
            BillingProviderPort.ApprovedPayment verified = billingProvider.query(paymentKey);
            if (!verified.orderId().equals(charge.orderId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "결제 주문 검증에 실패했습니다.");
            }
            if (verified.status().equals("DONE")) {
                stateStore.approve(charge.id(), verified);
            } else if (!verified.status().equals("CANCELED")
                    && !verified.status().equals("PARTIAL_CANCELED")) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "아직 확정할 수 없는 결제 상태입니다.");
            } else {
                stateStore.reportCancellation(charge, verified);
            }
            stateStore.completeWebhook(eventKey);
        } catch (RuntimeException exception) {
            stateStore.failWebhook(eventKey, "PROVIDER_REVERIFICATION_FAILED");
            throw exception;
        }
    }

    private String canonical(JsonNode payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "웹훅 본문이 올바르지 않습니다.");
        }
    }

    private static String text(JsonNode node, String field) {
        String value = node.path(field).asText("");
        if (value.isBlank() || value.length() > 300) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "웹훅 본문이 올바르지 않습니다.");
        }
        return value;
    }
}
