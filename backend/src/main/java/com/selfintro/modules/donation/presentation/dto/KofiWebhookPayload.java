package com.selfintro.modules.donation.presentation.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record KofiWebhookPayload(
        @JsonProperty("message_id") String messageId,
        @JsonProperty("timestamp") String timestamp,
        @JsonProperty("type") String type,
        @JsonProperty("from_name") String fromName,
        @JsonProperty("message") String message,
        @JsonProperty("amount") String amount,
        @JsonProperty("currency") String currency,
        @JsonProperty("url") String url,
        @JsonProperty("kofi_transaction_id") String kofiTransactionId,
        @JsonProperty("verification_token") String verificationToken) {}
