package com.selfintro.modules.donation.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.donation")
public record DonationProperties(int minAmount, int maxAmount, PayApp payapp) {

    public record PayApp(
            String apiUrl,
            String userId,
            String linkKey,
            String linkValue,
            String recvPhone,
            String feedbackUrl,
            String returnUrl) {

        public boolean isConfigured() {
            return !userId.isBlank() && !linkKey.isBlank() && !linkValue.isBlank();
        }
    }
}
