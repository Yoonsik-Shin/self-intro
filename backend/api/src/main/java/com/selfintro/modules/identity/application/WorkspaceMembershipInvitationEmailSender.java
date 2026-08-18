package com.selfintro.modules.identity.application;

import java.time.LocalDateTime;

public interface WorkspaceMembershipInvitationEmailSender {
    void send(
            String email,
            String workspaceName,
            String inviterDisplayName,
            String invitationUrl,
            LocalDateTime expiresAt);
}
