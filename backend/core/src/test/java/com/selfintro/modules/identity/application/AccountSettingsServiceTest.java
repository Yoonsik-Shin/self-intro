package com.selfintro.modules.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.identity.domain.AppUser;
import com.selfintro.modules.identity.domain.AppUserRepository;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class AccountSettingsServiceTest {

    @Mock AppUserRepository appUserRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock SecurityAuditService securityAuditService;

    AccountSettingsService service;

    @BeforeEach
    void setUp() {
        service =
                new AccountSettingsService(
                        appUserRepository,
                        passwordEncoder,
                        new RegistrationPasswordPolicy(),
                        securityAuditService);
    }

    @Test
    void trimsAndChangesDisplayName() {
        AppUser user = AppUser.createBootstrapOwner("owner", "hash", "기존 이름", null);
        when(appUserRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(user));

        String changed = service.changeDisplayName(1L, "  새 이름  ");

        assertThat(changed).isEqualTo("새 이름");
        assertThat(user.getDisplayName()).isEqualTo("새 이름");
        verify(securityAuditService)
                .recordPlatformTargetAction("ACCOUNT_DISPLAY_NAME_CHANGED", 1L, "APP_USER", 1L);
    }

    @Test
    void rejectsWrongCurrentPassword() {
        AppUser user = AppUser.createBootstrapOwner("owner", "old-hash", "이름", null);
        when(appUserRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "old-hash")).thenReturn(false);

        assertThatThrownBy(() -> service.changePassword(1L, "wrong", "NewPassword1!"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("현재 비밀번호");
    }

    @Test
    void changesPasswordAfterVerifyingCurrentPassword() {
        AppUser user = AppUser.createBootstrapOwner("owner", "old-hash", "이름", null);
        when(appUserRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("CurrentPassword1!", "old-hash")).thenReturn(true);
        when(passwordEncoder.matches("NewPassword1!", "old-hash")).thenReturn(false);
        when(passwordEncoder.encode("NewPassword1!")).thenReturn("new-hash");

        service.changePassword(1L, "CurrentPassword1!", "NewPassword1!");

        assertThat(user.getPasswordHash()).isEqualTo("new-hash");
        verify(securityAuditService)
                .recordPlatformTargetAction("ACCOUNT_PASSWORD_CHANGED", 1L, "APP_USER", 1L);
    }
}
