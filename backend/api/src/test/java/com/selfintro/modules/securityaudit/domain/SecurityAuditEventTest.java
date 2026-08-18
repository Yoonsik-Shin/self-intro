package com.selfintro.modules.securityaudit.domain;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class SecurityAuditEventTest {

    @Test
    void rejectsRawValuesInsteadOfBoundedAuditCodes() {
        assertThatThrownBy(
                        () ->
                                SecurityAuditEvent.authentication(
                                        "LOGIN_FAILURE", null, "DENIED", "user@example.com"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                        () ->
                                SecurityAuditEvent.workspaceTargetAction(
                                        "WORKSPACE_MEMBER_REMOVED", 1L, 2L, "member email", 3L))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsRawNetworkAndDeviceValues() {
        String hash = "a".repeat(64);
        assertThatThrownBy(() -> SecurityAuditEvent.anomaly(1L, "IP_CHANGED", "203.0.113.10", hash))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                        () -> SecurityAuditEvent.anomaly(1L, "DEVICE_CHANGED", hash, "Mozilla/5.0"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
