package com.selfintro.modules.aiusage.presentation.dto;

import java.time.LocalDateTime;

public record WorkspaceByokStatusResponse(
        String credentialMode,
        String provider,
        boolean generationEnabled,
        String maskedFingerprint,
        String credentialStatus,
        String keyVersion,
        LocalDateTime lastValidatedAt,
        LocalDateTime rotatedAt) {}
