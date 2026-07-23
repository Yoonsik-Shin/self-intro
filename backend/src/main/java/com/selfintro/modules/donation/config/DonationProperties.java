package com.selfintro.modules.donation.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.donation")
public record DonationProperties(int minAmount, int maxAmount, PayApp payapp, Kofi kofi) {

    public record PayApp(
            String apiUrl,
            String userId,
            String linkKey,
            String linkValue,
            String recvPhone,
            String feedbackUrl,
            String returnUrl) {

        public boolean isConfigured() {
            return userId != null
                    && !userId.isBlank()
                    && linkKey != null
                    && !linkKey.isBlank()
                    && linkValue != null
                    && !linkValue.isBlank();
        }
    }

    public record Kofi(String pageUrl, String verificationToken) {
        public boolean isConfigured() {
            return verificationToken != null && !verificationToken.isBlank();
        }
    }
}
