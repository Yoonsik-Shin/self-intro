package com.selfintro.modules.jobposting.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.web.WorkspaceAccessLevel;
import com.selfintro.modules.jobposting.application.WorkspaceJobApplicationCoverLetterService;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterItemResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterRevisionResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterSaveRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(
        "/api/workspaces/{workspaceSlug}/job-applications/manage/{jobPostingId}/cover-letter-items")
@RequiredArgsConstructor
public class WorkspaceJobCoverLetterController {

    private final WorkspaceJobApplicationCoverLetterService coverLetterService;

    @GetMapping
    public List<JobPostingCoverLetterItemResponse> list(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId,
            @PathVariable Long jobPostingId) {
        return coverLetterService.list(workspaceId, jobPostingId);
    }

    @PutMapping
    public List<JobPostingCoverLetterItemResponse> replace(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long jobPostingId,
            @Valid @RequestBody JobPostingCoverLetterSaveRequest request) {
        return coverLetterService.replace(workspaceId, jobPostingId, request);
    }

    @GetMapping("/{itemId}/revisions")
    public List<JobPostingCoverLetterRevisionResponse> revisions(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId,
            @PathVariable Long jobPostingId,
            @PathVariable Long itemId) {
        return coverLetterService.revisions(workspaceId, jobPostingId, itemId);
    }
}
