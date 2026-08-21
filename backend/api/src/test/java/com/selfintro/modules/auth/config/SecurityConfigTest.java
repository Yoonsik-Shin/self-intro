package com.selfintro.modules.auth.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class SecurityConfigTest {

    private final PasswordEncoder passwordEncoder = new SecurityConfig().passwordEncoder();

    @Test
    void acceptsLegacyUnprefixedBcryptAndMarksItForUpgrade() {
        String legacyHash = new BCryptPasswordEncoder(12).encode("legacy-password");

        assertThat(passwordEncoder.matches("legacy-password", legacyHash)).isTrue();
        assertThat(passwordEncoder.upgradeEncoding(legacyHash)).isTrue();
    }

    @Test
    void encodesNewPasswordsWithArgon2id() {
        String encoded = passwordEncoder.encode("new-password");

        assertThat(encoded).startsWith("{argon2id}");
        assertThat(passwordEncoder.matches("new-password", encoded)).isTrue();
        assertThat(passwordEncoder.upgradeEncoding(encoded)).isFalse();
    }
}
