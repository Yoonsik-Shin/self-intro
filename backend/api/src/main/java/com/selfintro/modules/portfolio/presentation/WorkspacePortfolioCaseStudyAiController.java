package com.selfintro.modules.portfolio.presentation;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.portfolio.application.PortfolioCaseStudyAiService;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyGenerateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/portfolio/case-studies/manage")
@RequiredArgsConstructor
public class WorkspacePortfolioCaseStudyAiController {

    private final PortfolioCaseStudyAiService portfolioCaseStudyAiService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @PostMapping(
            value = "/{caseStudyId}/revisions/generate",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter generate(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long caseStudyId,
            @Valid @RequestBody PortfolioCaseStudyGenerateRequest request) {
        Long workspaceId =
                workspaceAccessPolicy
                        .requireAnyRole(
                                authentication,
                                workspaceSlug,
                                WorkspaceRole.OWNER,
                                WorkspaceRole.ADMIN,
                                WorkspaceRole.EDITOR)
                        .getWorkspace()
                        .getId();
        return portfolioCaseStudyAiService.generateStream(workspaceId, caseStudyId, request);
    }
}
