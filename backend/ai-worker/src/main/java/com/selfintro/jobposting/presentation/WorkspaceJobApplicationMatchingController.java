package com.selfintro.jobposting.presentation;

import com.selfintro.jobposting.application.WorkspaceJobApplicationMatchingService;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/workspaces/{workspaceId}/job-applications/manage")
@RequiredArgsConstructor
public class WorkspaceJobApplicationMatchingController {

    private final WorkspaceJobApplicationMatchingService matchingService;

    @PostMapping("/{jobPostingId}/rematch")
    public JobPostingResponse rematch(
            @PathVariable Long workspaceId, @PathVariable Long jobPostingId) {
        return matchingService.rematch(workspaceId, jobPostingId);
    }
}
