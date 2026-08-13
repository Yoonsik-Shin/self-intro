package com.selfintro.modules.visitor.presentation;

import com.selfintro.modules.identity.application.PublicWorkspaceResolver;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.visitor.application.WorkspaceVisitorService;
import com.selfintro.modules.visitor.presentation.dto.VisitorSummaryResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/visits")
@RequiredArgsConstructor
public class WorkspaceVisitorController {
    private final WorkspaceVisitorService workspaceVisitorService;
    private final PublicWorkspaceResolver publicWorkspaceResolver;
    private final VisitorRequestIdentity visitorRequestIdentity;

    @PostMapping
    public ResponseEntity<VisitorSummaryResponse> recordVisit(
            @PathVariable String workspaceSlug,
            @CookieValue(name = VisitorRequestIdentity.VISITOR_COOKIE, required = false)
                    String visitorId,
            HttpServletRequest request,
            Authentication authentication,
            HttpServletResponse response) {
        Workspace workspace = publicWorkspaceResolver.requireBySlug(workspaceSlug);
        if (visitorRequestIdentity.shouldSkip(authentication, request)) {
            return ResponseEntity.ok(workspaceVisitorService.getSummary(workspace.getId()));
        }
        return ResponseEntity.ok(
                workspaceVisitorService.recordVisit(
                        workspace.getId(),
                        visitorRequestIdentity.resolveHash(visitorId, response),
                        request.getHeader("User-Agent")));
    }
}
