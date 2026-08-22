package com.selfintro.modules.auth.application;

import com.selfintro.modules.identity.domain.AppUser;
import com.selfintro.modules.identity.domain.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PasswordHashUpgradeService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void upgradeIfNeeded(Long userId, String rawPassword) {
        AppUser user = appUserRepository.findByIdForUpdate(userId).orElse(null);
        if (user == null || !user.isActive()) {
            return;
        }
        // 인증 직후 다른 요청이 비밀번호를 변경했을 수 있으므로 잠금으로 다시 읽은 최신 hash와도
        // 일치하는 경우에만 재해시한다. 그렇지 않으면 이전 비밀번호로 덮어쓰지 않는다.
        if (passwordEncoder.matches(rawPassword, user.getPasswordHash())
                && passwordEncoder.upgradeEncoding(user.getPasswordHash())) {
            user.changePasswordHash(passwordEncoder.encode(rawPassword));
        }
    }
}
