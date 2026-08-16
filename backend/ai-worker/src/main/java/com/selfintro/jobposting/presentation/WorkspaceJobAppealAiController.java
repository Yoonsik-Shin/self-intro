package com.selfintro.jobposting.presentation;

import com.selfintro.jobposting.application.JobPostingAppealService;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/workspaces/{workspaceId}/job-applications/manage")
@RequiredArgsConstructor
public class WorkspaceJobAppealAiController {

    private final JobPostingAppealService jobPostingAppealService;

    @PostMapping("/{jobPostingId}/analyze-appeal")
    public JobPostingResponse analyze(
            @PathVariable Long workspaceId,
            @PathVariable Long jobPostingId,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        return jobPostingAppealService.analyzeAppeal(
                workspaceId, jobPostingId, aiModel, customModelName);
    }
}
