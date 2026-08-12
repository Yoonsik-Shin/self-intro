package com.selfintro.modules.identity.presentation.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InvitationIssueRequest(
        @NotBlank @Size(max = 120) String label,
        @Email @Size(max = 255) String recipientEmail,
        @Min(1) @Max(100) int maxUses,
        @Min(1) @Max(720) int validForHours,
        boolean sendEmail) {}
