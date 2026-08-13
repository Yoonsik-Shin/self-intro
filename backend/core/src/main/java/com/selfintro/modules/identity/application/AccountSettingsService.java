package com.selfintro.modules.identity.application;

import com.selfintro.modules.identity.domain.AppUser;
import com.selfintro.modules.identity.domain.AppUserRepository;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AccountSettingsService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final RegistrationPasswordPolicy passwordPolicy;
    private final SecurityAuditService securityAuditService;

    @Transactional
    public String changeDisplayName(Long userId, String displayName) {
        AppUser user = requireActiveUserForUpdate(userId);
        user.changeDisplayName(displayName);
        securityAuditService.recordPlatformTargetAction(
                "ACCOUNT_DISPLAY_NAME_CHANGED", userId, "APP_USER", userId);
        return user.getDisplayName();
    }

    @Transactional
    public void changePassword(Long userId, String currentPassword, String newPassword) {
        AppUser user = requireActiveUserForUpdate(userId);
        if (currentPassword == null
                || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "현재 비밀번호가 올바르지 않습니다.");
        }
        passwordPolicy.validate(newPassword);
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("새 비밀번호는 현재 비밀번호와 달라야 합니다.");
        }
        user.changePasswordHash(passwordEncoder.encode(newPassword));
        securityAuditService.recordPlatformTargetAction(
                "ACCOUNT_PASSWORD_CHANGED", userId, "APP_USER", userId);
    }

    private AppUser requireActiveUserForUpdate(Long userId) {
        return appUserRepository
                .findByIdForUpdate(userId)
                .filter(AppUser::isActive)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND, "활성 계정을 찾을 수 없습니다."));
    }
}
