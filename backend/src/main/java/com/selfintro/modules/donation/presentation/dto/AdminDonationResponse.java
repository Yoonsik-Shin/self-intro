package com.selfintro.modules.donation.presentation.dto;

import com.selfintro.modules.donation.domain.Donation;
import com.selfintro.modules.donation.domain.DonationStatus;
import java.time.LocalDateTime;

public record AdminDonationResponse(
        Long id,
        int amount,
        String message,
        DonationStatus status,
        String mulNo,
        LocalDateTime createdAt,
        LocalDateTime paidAt,
        LocalDateTime canceledAt) {

    public static AdminDonationResponse from(Donation donation) {
        return new AdminDonationResponse(
                donation.getId(),
                donation.getAmount(),
                donation.getMessage(),
                donation.getStatus(),
                donation.getMulNo(),
                donation.getCreatedAt(),
                donation.getPaidAt(),
                donation.getCanceledAt());
    }
}
