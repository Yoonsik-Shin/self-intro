package com.selfintro.jobposting.presentation;

import com.selfintro.jobposting.application.JobPostingAppealService;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/job-applications/manage")
@RequiredArgsConstructor
public class WorkspaceJobAppealAiController {

    private final JobPostingAppealService jobPostingAppealService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @PostMapping("/{jobPostingId}/analyze-appeal")
    public JobPostingResponse analyze(
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
        return jobPostingAppealService.analyzeAppeal(
                workspaceId, jobPostingId, aiModel, customModelName);
    }
}
