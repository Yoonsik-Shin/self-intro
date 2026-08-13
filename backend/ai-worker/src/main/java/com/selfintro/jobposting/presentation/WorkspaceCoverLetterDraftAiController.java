package com.selfintro.jobposting.presentation;

import com.selfintro.jobposting.application.CoverLetterDraftAiService;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterDraftRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterDraftResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/worker/workspaces/{workspaceSlug}/job-applications/manage")
@RequiredArgsConstructor
public class WorkspaceCoverLetterDraftAiController {

    private final CoverLetterDraftAiService coverLetterDraftAiService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @PostMapping("/{jobPostingId}/generate-cover-letter-draft")
    public JobPostingCoverLetterDraftResponse generate(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId,
            @Valid @RequestBody JobPostingCoverLetterDraftRequest request) {
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
        return coverLetterDraftAiService.generateDraft(workspaceId, jobPostingId, request);
    }
}
