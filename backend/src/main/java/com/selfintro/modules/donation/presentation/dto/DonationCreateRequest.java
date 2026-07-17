package com.selfintro.modules.donation.presentation.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DonationCreateRequest(
        @NotNull @Min(1000) @Max(100000) Integer amount,
        @Size(max = 200) String message) {
}
