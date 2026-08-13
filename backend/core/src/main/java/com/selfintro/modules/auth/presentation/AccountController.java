package com.selfintro.modules.auth.presentation;

import com.selfintro.modules.auth.application.AppUserPrincipal;
import com.selfintro.modules.auth.application.RecentReauthenticationPolicy;
import com.selfintro.modules.auth.application.SessionSecurityService;
import com.selfintro.modules.auth.presentation.dto.AccountDisplayNameRequest;
import com.selfintro.modules.auth.presentation.dto.AccountDisplayNameResponse;
import com.selfintro.modules.auth.presentation.dto.AccountPasswordChangeRequest;
import com.selfintro.modules.auth.presentation.dto.AccountWithdrawalRequest;
import com.selfintro.modules.identity.application.AccountSettingsService;
import com.selfintro.modules.identity.application.AccountWithdrawalService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/account")
public class AccountController {

    private final AccountWithdrawalService accountWithdrawalService;
    private final AccountSettingsService accountSettingsService;
    private final RecentReauthenticationPolicy recentReauthenticationPolicy;
    private final SessionSecurityService sessionSecurityService;

    @PatchMapping("/display-name")
    public AccountDisplayNameResponse changeDisplayName(
            @Valid @RequestBody AccountDisplayNameRequest request, Authentication authentication) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        return new AccountDisplayNameResponse(
                accountSettingsService.changeDisplayName(
                        principal.userId(), request.displayName()));
    }

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody AccountPasswordChangeRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        accountSettingsService.changePassword(
                principal.userId(), request.currentPassword(), request.newPassword());
        sessionSecurityService.logoutAll(principal.getUsername(), httpRequest);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/withdrawal-readiness")
    public AccountWithdrawalService.WithdrawalReadiness withdrawalReadiness(
            Authentication authentication) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        return accountWithdrawalService.readiness(principal.userId());
    }

    @DeleteMapping
    public ResponseEntity<Void> withdraw(
            @Valid @RequestBody AccountWithdrawalRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        recentReauthenticationPolicy.requireExplicitRecent(httpRequest.getSession(true));
        accountWithdrawalService.withdraw(principal.userId(), request.confirmation());
        sessionSecurityService.logoutAll(principal.getUsername(), httpRequest);
        return ResponseEntity.noContent().build();
    }

    private AppUserPrincipal requirePrincipal(Authentication authentication) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof AppUserPrincipal principal)) {
            throw new InsufficientAuthenticationException("로그인이 필요합니다.");
        }
        return principal;
    }
}
