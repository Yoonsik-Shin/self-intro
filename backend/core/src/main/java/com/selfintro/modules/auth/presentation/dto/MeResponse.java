package com.selfintro.modules.auth.presentation.dto;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public record MeResponse(
        Long userId,
        String username,
        String email,
        String nickname,
        boolean mfaEnabled,
        boolean mfaEnrollmentRequired,
        boolean mfaRecoveryReenrollmentAllowed,
        Set<String> platformRoles,
        List<WorkspaceMembershipResponse> workspaces) {

    public record WorkspaceMembershipResponse(
            Long workspaceId, UUID publicKey, String slug, String name, String role) {}
}
