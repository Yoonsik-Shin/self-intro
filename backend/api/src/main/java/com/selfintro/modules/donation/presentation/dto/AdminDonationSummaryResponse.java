package com.selfintro.modules.donation.presentation.dto;

import java.util.List;

public record AdminDonationSummaryResponse(
        List<CurrencyTotal> paidTotals, List<AdminDonationResponse> donations) {

    public record CurrencyTotal(String currency, long total, long count) {}
}
