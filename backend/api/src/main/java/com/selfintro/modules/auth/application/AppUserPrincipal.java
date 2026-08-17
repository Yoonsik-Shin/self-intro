package com.selfintro.modules.auth.application;

import com.selfintro.modules.identity.domain.AppUser;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public record AppUserPrincipal(
        Long userId,
        String username,
        String password,
        boolean enabled,
        boolean mfaEnabled,
        Set<String> platformRoles,
        Collection<? extends GrantedAuthority> authorities)
        implements UserDetails {

    public static AppUserPrincipal of(AppUser user, Set<String> platformRoles) {
        Set<SimpleGrantedAuthority> authorities = new HashSet<>();
        boolean platformAccount = !platformRoles.isEmpty();
        if (platformAccount && !user.isMfaEnabled()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_MFA_ENROLLMENT_REQUIRED"));
        } else {
            platformRoles.stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                    .forEach(authorities::add);
            if (platformRoles.contains("PLATFORM_OWNER")
                    || platformRoles.contains("PLATFORM_OPERATOR")) {
                authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
            }
        }
        return new AppUserPrincipal(
                user.getId(),
                user.getLoginId(),
                user.getPasswordHash(),
                user.isActive(),
                user.isMfaEnabled(),
                Set.copyOf(platformRoles),
                Set.copyOf(authorities));
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
