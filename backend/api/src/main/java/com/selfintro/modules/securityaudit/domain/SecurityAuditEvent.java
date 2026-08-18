package com.selfintro.modules.securityaudit.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.regex.Pattern;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "security_audit_event")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SecurityAuditEvent {

    private static final Pattern CODE = Pattern.compile("[A-Z][A-Z0-9_]*");
    private static final Pattern SHA_256_HEX = Pattern.compile("[0-9a-f]{64}");
    private static final Set<String> RESULTS = Set.of("SUCCESS", "DENIED", "OBSERVED");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_type", nullable = false, length = 60)
    private String eventType;

    @Column(name = "actor_user_id")
    private Long actorUserId;

    @Column(name = "workspace_id")
    private Long workspaceId;

    @Column(name = "target_type", length = 60)
    private String targetType;

    @Column(name = "target_id", length = 120)
    private String targetId;

    @Column(nullable = false, length = 20)
    private String result;

    @Column(name = "reason_code", length = 80)
    private String reasonCode;

    @Column(name = "request_id", length = 100)
    private String requestId;

    @Column(name = "ip_hash", length = 128)
    private String ipHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static SecurityAuditEvent authentication(
            String eventType, Long actorUserId, String result, String reasonCode) {
        SecurityAuditEvent event = new SecurityAuditEvent();
        event.eventType = requireCode(eventType, "eventType", 60);
        event.actorUserId = actorUserId;
        if (!RESULTS.contains(result)) {
            throw new IllegalArgumentException("감사 결과 코드가 올바르지 않습니다.");
        }
        event.result = result;
        event.reasonCode = reasonCode == null ? null : requireCode(reasonCode, "reasonCode", 80);
        event.createdAt = LocalDateTime.now();
        return event;
    }

    public static SecurityAuditEvent authorizationDenied(
            Long actorUserId, Long workspaceId, String reasonCode) {
        SecurityAuditEvent event =
                authentication("AUTHORIZATION_DENIED", actorUserId, "DENIED", reasonCode);
        event.workspaceId = workspaceId;
        event.targetType = "WORKSPACE";
        event.targetId = workspaceId == null ? null : workspaceId.toString();
        return event;
    }

    public static SecurityAuditEvent anomaly(
            Long actorUserId, String reasonCode, String ipHash, String deviceHash) {
        SecurityAuditEvent event =
                authentication("LOGIN_CONTEXT_ANOMALY", actorUserId, "OBSERVED", reasonCode);
        event.ipHash = requireSha256Hex(ipHash, "ipHash");
        event.targetType = "SESSION_DEVICE";
        event.targetId = requireSha256Hex(deviceHash, "deviceHash");
        return event;
    }

    public static SecurityAuditEvent invitation(
            String eventType, Long actorUserId, Long invitationId) {
        SecurityAuditEvent event = authentication(eventType, actorUserId, "SUCCESS", null);
        event.targetType = "REGISTRATION_INVITATION";
        event.targetId = invitationId == null ? null : invitationId.toString();
        return event;
    }

    public static SecurityAuditEvent workspaceAction(
            String eventType, Long actorUserId, Long workspaceId) {
        SecurityAuditEvent event = authentication(eventType, actorUserId, "SUCCESS", null);
        event.workspaceId = workspaceId;
        event.targetType = "WORKSPACE";
        event.targetId = workspaceId == null ? null : workspaceId.toString();
        return event;
    }

    public static SecurityAuditEvent workspaceTargetAction(
            String eventType,
            Long actorUserId,
            Long workspaceId,
            String targetType,
            Long targetId) {
        SecurityAuditEvent event = workspaceAction(eventType, actorUserId, workspaceId);
        event.targetType = requireCode(targetType, "targetType", 60);
        event.targetId = targetId == null ? null : targetId.toString();
        return event;
    }

    private static String requireCode(String value, String field, int maxLength) {
        if (value == null || value.length() > maxLength || !CODE.matcher(value).matches()) {
            throw new IllegalArgumentException(field + "에는 제한된 감사 코드만 사용할 수 있습니다.");
        }
        return value;
    }

    private static String requireSha256Hex(String value, String field) {
        if (value == null || !SHA_256_HEX.matcher(value).matches()) {
            throw new IllegalArgumentException(field + "에는 HMAC-SHA256 hex만 사용할 수 있습니다.");
        }
        return value;
    }
}
