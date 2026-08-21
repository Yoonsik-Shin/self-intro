package com.selfintro.modules.aiusage.application;

import java.util.UUID;

public record AiUsageReservation(
        Long usageId,
        UUID publicId,
        Long workspaceId,
        Long actorUserId,
        AiFeature feature,
        String operationCode,
        String sessionKey,
        int estimatedPoints,
        int reservedPoints,
        boolean enforcementEnabled,
        String evidencePolicyVersion,
        String consentPolicyVersion) {}
