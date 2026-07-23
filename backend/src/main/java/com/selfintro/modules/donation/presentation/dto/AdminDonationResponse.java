package com.selfintro.modules.donation.presentation.dto;

import com.selfintro.modules.donation.domain.Donation;
import com.selfintro.modules.donation.domain.DonationStatus;
import java.time.LocalDateTime;

public record AdminDonationResponse(
        Long id,
        int amount,
        String currency,
        String message,
        DonationStatus status,
        String mulNo,
        boolean subscription,
        LocalDateTime createdAt,
        LocalDateTime paidAt,
        LocalDateTime providerPaidAt,
        LocalDateTime canceledAt) {

    public static AdminDonationResponse from(Donation donation) {
        return new AdminDonationResponse(
                donation.getId(),
                donation.getAmount(),
                donation.getCurrency(),
                donation.getMessage(),
                donation.getStatus(),
                donation.getMulNo(),
                donation.isSubscription(),
                donation.getCreatedAt(),
                donation.getPaidAt(),
                donation.getProviderPaidAt(),
                donation.getCanceledAt());
    }
}
