package com.selfintro.modules.identity.presentation;

import com.selfintro.modules.identity.application.PublicWorkspaceResolver;
import com.selfintro.modules.identity.application.WorkspaceSlugService;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.presentation.dto.WorkspaceSlugResolutionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/public/workspaces")
public class PublicWorkspaceSlugController {

    private final PublicWorkspaceResolver publicWorkspaceResolver;
    private final WorkspaceSlugService slugService;

    @GetMapping("/{workspaceSlug}/resolution")
    public WorkspaceSlugResolutionResponse resolution(@PathVariable String workspaceSlug) {
        Workspace workspace = publicWorkspaceResolver.requireBySlug(workspaceSlug);
        return slugService.resolution(workspaceSlug, workspace);
    }
}
