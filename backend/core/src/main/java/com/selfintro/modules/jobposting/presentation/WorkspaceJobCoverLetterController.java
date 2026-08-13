package com.selfintro.modules.jobposting.presentation;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.jobposting.application.WorkspaceJobApplicationCoverLetterService;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterItemResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterRevisionResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterSaveRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/job-applications/manage/{jobPostingId}/cover-letter-items")
@RequiredArgsConstructor
public class WorkspaceJobCoverLetterController {

    private final WorkspaceJobApplicationCoverLetterService coverLetterService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @GetMapping
    public List<JobPostingCoverLetterItemResponse> list(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId) {
        return coverLetterService.list(
                readWorkspaceId(authentication, workspaceSlug), jobPostingId);
    }

    @PutMapping
    public List<JobPostingCoverLetterItemResponse> replace(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId,
            @Valid @RequestBody JobPostingCoverLetterSaveRequest request) {
        return coverLetterService.replace(
                writeWorkspaceId(authentication, workspaceSlug), jobPostingId, request);
    }

    @GetMapping("/{itemId}/revisions")
    public List<JobPostingCoverLetterRevisionResponse> revisions(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId,
            @PathVariable Long itemId) {
        return coverLetterService.revisions(
                readWorkspaceId(authentication, workspaceSlug), jobPostingId, itemId);
    }

    private Long readWorkspaceId(Authentication authentication, String workspaceSlug) {
        return workspaceAccessPolicy
                .requireAnyRole(
                        authentication,
                        workspaceSlug,
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR,
                        WorkspaceRole.VIEWER)
                .getWorkspace()
                .getId();
    }

    private Long writeWorkspaceId(Authentication authentication, String workspaceSlug) {
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
