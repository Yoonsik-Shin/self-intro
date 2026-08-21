package com.selfintro.modules.billing.presentation;

import com.fasterxml.jackson.databind.JsonNode;
import com.selfintro.modules.billing.application.TossBillingWebhookService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/billing/webhooks/toss")
@RequiredArgsConstructor
public class TossBillingWebhookController {

    private final TossBillingWebhookService webhookService;

    @PostMapping
    public ResponseEntity<Void> receive(@RequestBody JsonNode payload) {
        webhookService.receive(payload);
        return ResponseEntity.ok().build();
    }
}
