package com.selfintro.modules.auth.presentation.dto;

public record ReauthenticationStatusResponse(
        Long expiresAtEpochMillis, Long explicitExpiresAtEpochMillis) {}
