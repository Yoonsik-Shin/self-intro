package com.selfintro.modules.dashboard.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.web.WorkspaceAccessLevel;
import com.selfintro.modules.dashboard.application.WorkspaceDashboardSummaryService;
import com.selfintro.modules.dashboard.presentation.dto.WorkspaceDashboardSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/dashboard-summary")
@RequiredArgsConstructor
public class WorkspaceDashboardSummaryController {

    private final WorkspaceDashboardSummaryService dashboardSummaryService;

    @GetMapping
    public WorkspaceDashboardSummaryResponse getSummary(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId) {
        return dashboardSummaryService.getSummary(workspaceId);
    }
}
