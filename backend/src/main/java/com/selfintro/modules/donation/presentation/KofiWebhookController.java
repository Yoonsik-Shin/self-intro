package com.selfintro.modules.donation.presentation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.donation.application.DonationService;
import com.selfintro.modules.donation.presentation.dto.KofiWebhookPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
public class KofiWebhookController {
    private final DonationService donationService;
    private final ObjectMapper objectMapper;

    @PostMapping(
            value = "/api/donations/kofi/webhook",
            consumes = {
                MediaType.APPLICATION_FORM_URLENCODED_VALUE,
                MediaType.APPLICATION_JSON_VALUE
            })
    public ResponseEntity<String> webhook(
            @RequestParam(value = "data", required = false) String dataParam,
            @RequestBody(required = false) String rawBody) {
        KofiWebhookPayload payload = null;
        try {
            if (dataParam != null && !dataParam.isBlank()) {
                payload = objectMapper.readValue(dataParam, KofiWebhookPayload.class);
            } else if (rawBody != null && !rawBody.isBlank()) {
                payload = objectMapper.readValue(rawBody, KofiWebhookPayload.class);
            }
        } catch (Exception e) {
            log.warn("Ko-fi Webhook payload 파싱 실패: ", e);
            return ResponseEntity.badRequest().body("INVALID_PAYLOAD");
        }

        if (payload == null) {
            return ResponseEntity.badRequest().body("EMPTY_PAYLOAD");
        }

        boolean accepted = donationService.handleKofiWebhook(payload);
        return accepted ? ResponseEntity.ok("SUCCESS") : ResponseEntity.badRequest().body("FAIL");
    }
}
