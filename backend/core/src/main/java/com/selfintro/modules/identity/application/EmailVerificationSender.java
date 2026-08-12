package com.selfintro.modules.identity.application;

public interface EmailVerificationSender {
    void send(String email, String rawToken);
}
