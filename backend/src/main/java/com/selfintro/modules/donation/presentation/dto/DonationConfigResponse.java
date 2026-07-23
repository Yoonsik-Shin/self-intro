package com.selfintro.modules.donation.presentation.dto;

public record DonationConfigResponse(boolean enabled, String kofiPageUrl) {
    public DonationConfigResponse(boolean enabled) {
        this(enabled, null);
    }
}
