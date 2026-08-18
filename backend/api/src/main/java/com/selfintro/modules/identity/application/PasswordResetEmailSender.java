package com.selfintro.modules.identity.application;

public interface PasswordResetEmailSender {
    default void ensureAvailable() {}

    void send(String email, String rawToken);
}
