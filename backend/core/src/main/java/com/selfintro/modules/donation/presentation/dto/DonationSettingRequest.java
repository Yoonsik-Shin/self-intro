package com.selfintro.modules.donation.presentation.dto;

import jakarta.validation.constraints.NotNull;

public record DonationSettingRequest(@NotNull Boolean enabled) {}
