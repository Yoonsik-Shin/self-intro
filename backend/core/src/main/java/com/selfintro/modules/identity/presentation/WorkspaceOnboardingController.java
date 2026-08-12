package com.selfintro.modules.identity.presentation;

import com.selfintro.modules.auth.application.AppUserPrincipal;
import com.selfintro.modules.identity.application.RegistrationService;
import com.selfintro.modules.identity.presentation.dto.WorkspaceOnboardingRequest;
import com.selfintro.modules.identity.presentation.dto.WorkspaceOnboardingResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspaces")
public class WorkspaceOnboardingController {

    private final RegistrationService registrationService;

    @PostMapping("/onboarding")
    public WorkspaceOnboardingResponse createFirstWorkspace(
            Authentication authentication, @Valid @RequestBody WorkspaceOnboardingRequest request) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof AppUserPrincipal principal)) {
            throw new org.springframework.security.authentication
                    .InsufficientAuthenticationException("로그인이 필요합니다.");
        }
        return WorkspaceOnboardingResponse.from(
                registrationService.createFirstWorkspace(principal.userId(), request.name()));
    }
}
