package com.selfintro.modules.identity.presentation;

import com.selfintro.modules.auth.application.AppUserPrincipal;
import com.selfintro.modules.auth.application.RecentReauthenticationPolicy;
import com.selfintro.modules.identity.application.WorkspacePurgeService;
import com.selfintro.modules.identity.application.WorkspacePurgeService.PurgeJobView;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ops/workspace-purge-jobs")
public class WorkspacePurgeOperationsController {

    private final WorkspacePurgeService purgeService;
    private final RecentReauthenticationPolicy reauthenticationPolicy;
    private final SecurityAuditService securityAuditService;

    @GetMapping
    public List<PurgeJobView> list() {
        return purgeService.list();
    }

    @PostMapping("/{jobId}/dry-run")
    @Transactional
    public PurgeJobView dryRun(
            Authentication authentication, HttpSession session, @PathVariable Long jobId) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        reauthenticationPolicy.requireRecent(session);
        PurgeJobView result = purgeService.dryRun(jobId);
        securityAuditService.recordWorkspaceAction(
                "WORKSPACE_PURGE_DRY_RUN", principal.userId(), result.workspaceId());
        return result;
    }

    private AppUserPrincipal requirePrincipal(Authentication authentication) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof AppUserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return principal;
    }
}
