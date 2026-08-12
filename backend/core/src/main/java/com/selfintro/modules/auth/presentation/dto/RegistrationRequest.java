package com.selfintro.modules.auth.presentation.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegistrationRequest(
        @NotBlank @Size(max = 200) String invitationCode,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 10, max = 32) String password,
        @NotBlank @Size(min = 2, max = 40) String nickname,
        @AssertTrue boolean termsAccepted,
        @AssertTrue boolean privacyAccepted,
        boolean marketingAccepted) {}
