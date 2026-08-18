package com.selfintro.modules.auth.presentation;

import com.selfintro.modules.auth.application.AuthenticationRateLimitService;
import com.selfintro.modules.auth.presentation.dto.EmailVerificationRequest;
import com.selfintro.modules.auth.presentation.dto.PasswordResetConfirmRequest;
import com.selfintro.modules.auth.presentation.dto.PasswordResetRequest;
import com.selfintro.modules.auth.presentation.dto.RegistrationRequest;
import com.selfintro.modules.identity.application.PasswordResetService;
import com.selfintro.modules.identity.application.RegistrationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class RegistrationController {

    private final RegistrationService registrationService;
    private final PasswordResetService passwordResetService;
    private final AuthenticationRateLimitService authenticationRateLimitService;

    @GetMapping("/csrf")
    public ResponseEntity<Void> csrf() {
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/registrations")
    public ResponseEntity<Void> register(
            @Valid @RequestBody RegistrationRequest request, HttpServletRequest httpRequest) {
        authenticationRateLimitService.requireRegistrationAllowance(request.email(), httpRequest);
        registrationService.register(
                request.invitationCode(),
                request.email(),
                request.password(),
                request.nickname(),
                request.termsAccepted(),
                request.privacyAccepted(),
                request.marketingAccepted());
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/email-verifications")
    public ResponseEntity<Void> verifyEmail(@Valid @RequestBody EmailVerificationRequest request) {
        registrationService.verifyEmail(request.token());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/password-resets")
    public ResponseEntity<Void> requestPasswordReset(
            @Valid @RequestBody PasswordResetRequest request, HttpServletRequest httpRequest) {
        authenticationRateLimitService.requirePasswordResetAllowance(request.email(), httpRequest);
        passwordResetService.request(request.email());
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/password-resets/confirm")
    public ResponseEntity<Void> confirmPasswordReset(
            @Valid @RequestBody PasswordResetConfirmRequest request,
            HttpServletRequest httpRequest) {
        passwordResetService.confirm(request.token(), request.newPassword());
        HttpSession currentSession = httpRequest.getSession(false);
        if (currentSession != null) {
            currentSession.invalidate();
        }
        return ResponseEntity.noContent().build();
    }
}
