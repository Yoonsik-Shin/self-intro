package com.selfintro.modules.aiusage.application;

import java.util.Set;

public record AiExecutionCommand(
        Long workspaceId,
        Long actorUserId,
        AiFeature feature,
        String operationCode,
        String sessionKey,
        boolean refinement,
        int estimatedPoints,
        String acknowledgedConsentVersion,
        Set<String> dataCategories) {

    public AiExecutionCommand {
        dataCategories = dataCategories == null ? Set.of() : Set.copyOf(dataCategories);
    }

    public AiExecutionCommand(
            Long workspaceId,
            Long actorUserId,
            AiFeature feature,
            String operationCode,
            int estimatedPoints,
            String acknowledgedConsentVersion,
            Set<String> dataCategories) {
        this(
                workspaceId,
                actorUserId,
                feature,
                operationCode,
                operationCode,
                false,
                estimatedPoints,
                acknowledgedConsentVersion,
                dataCategories);
    }
}
