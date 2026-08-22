package com.selfintro.modules.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.identity.domain.AppUser;
import com.selfintro.modules.identity.domain.AppUserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class PasswordHashUpgradeServiceTest {

    @Mock AppUserRepository appUserRepository;
    @Mock PasswordEncoder passwordEncoder;

    private PasswordHashUpgradeService service;

    @BeforeEach
    void setUp() {
        service = new PasswordHashUpgradeService(appUserRepository, passwordEncoder);
    }

    @Test
    void upgradesLegacyHashAfterSuccessfulAuthentication() {
        AppUser user = AppUser.createBootstrapOwner("owner", "legacy-bcrypt", "Owner", null);
        when(appUserRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("correct-password", "legacy-bcrypt")).thenReturn(true);
        when(passwordEncoder.upgradeEncoding("legacy-bcrypt")).thenReturn(true);
        when(passwordEncoder.encode("correct-password")).thenReturn("{argon2id}new-hash");

        service.upgradeIfNeeded(1L, "correct-password");

        assertThat(user.getPasswordHash()).isEqualTo("{argon2id}new-hash");
    }

    @Test
    void keepsCurrentHashWithoutReencoding() {
        AppUser user = AppUser.createBootstrapOwner("owner", "{argon2id}current", "Owner", null);
        when(appUserRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("correct-password", "{argon2id}current")).thenReturn(true);
        when(passwordEncoder.upgradeEncoding("{argon2id}current")).thenReturn(false);

        service.upgradeIfNeeded(1L, "correct-password");

        assertThat(user.getPasswordHash()).isEqualTo("{argon2id}current");
        verify(passwordEncoder, never()).encode("correct-password");
    }

    @Test
    void doesNotOverwriteAConcurrentlyChangedPassword() {
        AppUser user = AppUser.createBootstrapOwner("owner", "new-password-hash", "Owner", null);
        when(appUserRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("old-password", "new-password-hash")).thenReturn(false);

        service.upgradeIfNeeded(1L, "old-password");

        assertThat(user.getPasswordHash()).isEqualTo("new-password-hash");
        verify(passwordEncoder, never()).upgradeEncoding("new-password-hash");
        verify(passwordEncoder, never()).encode("old-password");
    }
}
