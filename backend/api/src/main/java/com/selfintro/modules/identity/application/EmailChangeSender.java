package com.selfintro.modules.identity.application;

public interface EmailChangeSender {
    default void ensureAvailable() {}

    void send(String email, String rawToken);
}
