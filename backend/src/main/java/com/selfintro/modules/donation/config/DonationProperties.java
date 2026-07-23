package com.selfintro.modules.donation.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.donation")
public record DonationProperties(Kofi kofi) {

    public record Kofi(String pageUrl, String verificationToken) {
        public boolean isConfigured() {
            return verificationToken != null && !verificationToken.isBlank();
        }
    }
}
