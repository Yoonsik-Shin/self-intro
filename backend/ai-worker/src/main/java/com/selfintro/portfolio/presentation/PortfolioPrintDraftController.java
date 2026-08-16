package com.selfintro.portfolio.presentation;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.portfolio.application.PortfolioPrintDraftService;
import com.selfintro.portfolio.presentation.dto.PortfolioPrintDraftRevisionRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspaces/{workspaceSlug}/portfolio/case-studies/manage")
public class PortfolioPrintDraftController {

    private final PortfolioPrintDraftService portfolioPrintDraftService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @PostMapping(
            value = "/{caseStudyId}/print-draft/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter generatePrintDraftStream(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long caseStudyId,
            @RequestParam String orientation,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        return portfolioPrintDraftService.generateStream(
                writableWorkspaceId(authentication, workspaceSlug),
                caseStudyId,
                orientation,
                aiModel,
                customModelName);
    }

    @PostMapping(
            value = "/{caseStudyId}/print-draft/{templateId}/revise/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter revisePrintDraftStream(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long caseStudyId,
            @PathVariable Long templateId,
            @Valid @RequestBody PortfolioPrintDraftRevisionRequest request,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        return portfolioPrintDraftService.reviseStream(
                writableWorkspaceId(authentication, workspaceSlug),
                caseStudyId,
                templateId,
                request.feedbackInstruction(),
                aiModel,
                customModelName);
    }

    private Long writableWorkspaceId(Authentication authentication, String workspaceSlug) {
        return workspaceAccessPolicy
                .requireAnyRole(
                        authentication,
                        workspaceSlug,
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR)
                .getWorkspace()
                .getId();
    }
}
