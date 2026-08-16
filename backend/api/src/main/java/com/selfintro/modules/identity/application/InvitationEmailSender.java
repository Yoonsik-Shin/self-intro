package com.selfintro.modules.identity.application;

import java.time.LocalDateTime;

public interface InvitationEmailSender {
    void send(String email, String invitationUrl, LocalDateTime expiresAt);
}
