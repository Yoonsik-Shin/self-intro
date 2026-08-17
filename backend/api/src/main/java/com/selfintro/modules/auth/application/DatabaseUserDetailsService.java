package com.selfintro.modules.auth.application;

import com.selfintro.modules.identity.domain.AppUser;
import com.selfintro.modules.identity.domain.AppUserRepository;
import com.selfintro.modules.identity.domain.UserPlatformRoleRepository;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DatabaseUserDetailsService implements UserDetailsService {

    private final AppUserRepository appUserRepository;
    private final UserPlatformRoleRepository platformRoleRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        AppUser user =
                appUserRepository
                        .findByEmailCanonical(username.trim().toLowerCase(Locale.ROOT))
                        .or(() -> appUserRepository.findByLoginId(username))
                        .filter(AppUser::isActive)
                        .orElseThrow(() -> new UsernameNotFoundException("계정을 확인할 수 없습니다."));
        Set<String> platformRoles =
                platformRoleRepository.findAllByUserId(user.getId()).stream()
                        .map(role -> role.getRole().name())
                        .collect(Collectors.toSet());
        return AppUserPrincipal.of(user, platformRoles);
    }
}
