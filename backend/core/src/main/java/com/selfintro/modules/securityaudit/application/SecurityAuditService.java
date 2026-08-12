package com.selfintro.modules.securityaudit.application;

import com.selfintro.modules.securityaudit.domain.SecurityAuditEvent;
import com.selfintro.modules.securityaudit.domain.SecurityAuditEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SecurityAuditService {

    private final SecurityAuditEventRepository auditEventRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordAuthorizationDenied(Long userId, Long workspaceId, String reasonCode) {
        auditEventRepository.save(
                SecurityAuditEvent.authorizationDenied(userId, workspaceId, reasonCode));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordLoginContextAnomaly(
            Long userId, String reasonCode, String ipHash, String deviceHash) {
        auditEventRepository.save(
                SecurityAuditEvent.anomaly(userId, reasonCode, ipHash, deviceHash));
    }

    @Transactional
    public void recordInvitationAction(String eventType, Long actorUserId, Long invitationId) {
        auditEventRepository.save(
                SecurityAuditEvent.invitation(eventType, actorUserId, invitationId));
    }

    @Transactional
    public void recordWorkspaceAction(String eventType, Long actorUserId, Long workspaceId) {
        auditEventRepository.save(
                SecurityAuditEvent.workspaceAction(eventType, actorUserId, workspaceId));
    }

    @Transactional
    public void recordWorkspaceTargetAction(
            String eventType,
            Long actorUserId,
            Long workspaceId,
            String targetType,
            Long targetId) {
        auditEventRepository.save(
                SecurityAuditEvent.workspaceTargetAction(
                        eventType, actorUserId, workspaceId, targetType, targetId));
    }

    @Transactional
    public void recordPlatformTargetAction(
            String eventType, Long actorUserId, String targetType, Long targetId) {
        auditEventRepository.save(
                SecurityAuditEvent.workspaceTargetAction(
                        eventType, actorUserId, null, targetType, targetId));
    }
}
