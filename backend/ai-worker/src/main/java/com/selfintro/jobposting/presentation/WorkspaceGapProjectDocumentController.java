package com.selfintro.jobposting.presentation;

import com.selfintro.jobposting.application.GapProjectDocumentService;
import com.selfintro.jobposting.presentation.dto.GapProjectDocumentResponse;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/worker/workspaces/{workspaceSlug}/job-applications/manage")
@RequiredArgsConstructor
public class WorkspaceGapProjectDocumentController {

    private final GapProjectDocumentService gapProjectDocumentService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @GetMapping("/{jobPostingId}/gap-project-documents")
    public List<GapProjectDocumentResponse> list(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId) {
        Long workspaceId =
                workspaceAccessPolicy
                        .requireAnyRole(
                                authentication,
                                workspaceSlug,
                                WorkspaceRole.OWNER,
                                WorkspaceRole.ADMIN,
                                WorkspaceRole.EDITOR,
                                WorkspaceRole.VIEWER)
                        .getWorkspace()
                        .getId();
        return gapProjectDocumentService.list(workspaceId, jobPostingId);
    }

    @PostMapping("/{jobPostingId}/gap-project-documents")
    public GapProjectDocumentResponse generate(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
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
        return gapProjectDocumentService.generate(
                workspaceId, jobPostingId, aiModel, customModelName);
    }
}
