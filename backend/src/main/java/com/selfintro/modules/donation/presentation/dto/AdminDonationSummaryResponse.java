package com.selfintro.modules.donation.presentation.dto;

import java.util.List;

public record AdminDonationSummaryResponse(long paidTotal, long paidCount, List<AdminDonationResponse> donations) {
}
