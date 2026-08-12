package com.selfintro.modules.identity.presentation;

import com.selfintro.modules.auth.application.AppUserPrincipal;
import com.selfintro.modules.auth.application.RecentReauthenticationPolicy;
import com.selfintro.modules.identity.application.InvitationAdministrationService;
import com.selfintro.modules.identity.application.InvitationAdministrationService.InvitationView;
import com.selfintro.modules.identity.application.InvitationAdministrationService.IssuedInvitation;
import com.selfintro.modules.identity.presentation.dto.InvitationIssueRequest;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ops/invitations")
public class InvitationOperationsController {

    private final InvitationAdministrationService invitationService;
    private final RecentReauthenticationPolicy reauthenticationPolicy;
    private final SecurityAuditService securityAuditService;

    @GetMapping
    public List<InvitationView> list() {
        return invitationService.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public IssuedInvitation issue(
            Authentication authentication,
            HttpSession session,
            @Valid @RequestBody InvitationIssueRequest request) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        reauthenticationPolicy.requireRecent(session);
        IssuedInvitation issued =
                invitationService.issue(
                        principal.userId(),
                        request.label(),
                        request.recipientEmail(),
                        request.maxUses(),
                        request.validForHours(),
                        request.sendEmail());
        securityAuditService.recordInvitationAction(
                "INVITATION_ISSUED", principal.userId(), issued.invitation().id());
        return issued;
    }

    @DeleteMapping("/{invitationId}")
    @Transactional
    public InvitationView revoke(
            Authentication authentication, HttpSession session, @PathVariable Long invitationId) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        reauthenticationPolicy.requireRecent(session);
        InvitationView invitation = invitationService.revoke(invitationId);
        securityAuditService.recordInvitationAction(
                "INVITATION_REVOKED", principal.userId(), invitationId);
        return invitation;
    }

    @PostMapping("/{invitationId}/replacement-email")
    @Transactional
    public IssuedInvitation replaceAndSend(
            Authentication authentication, HttpSession session, @PathVariable Long invitationId) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        reauthenticationPolicy.requireRecent(session);
        IssuedInvitation issued =
                invitationService.replaceAndSend(principal.userId(), invitationId);
        securityAuditService.recordInvitationAction(
                "INVITATION_REPLACED", principal.userId(), issued.invitation().id());
        return issued;
    }

    private AppUserPrincipal requirePrincipal(Authentication authentication) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof AppUserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return principal;
    }

    @ExceptionHandler(AuthenticationException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public void handleAuthenticationException() {}
}
