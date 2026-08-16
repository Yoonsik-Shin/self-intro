package com.selfintro.modules.taxonomy.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.web.WorkspaceAccessLevel;
import com.selfintro.modules.taxonomy.application.TaxonomySchemeService;
import com.selfintro.modules.taxonomy.presentation.dto.TaxonomySchemeResponse;
import com.selfintro.modules.taxonomy.presentation.dto.WorkspaceTaxonomySchemeSelectionRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspaces/{workspaceSlug}/taxonomy-schemes")
public class WorkspaceTaxonomySchemeController {

    private final TaxonomySchemeService taxonomySchemeService;

    @GetMapping("/catalog")
    public List<TaxonomySchemeResponse> catalog(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId) {
        return taxonomySchemeService.listPlatformCatalog();
    }

    @GetMapping
    public List<TaxonomySchemeResponse> subscriptions(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId) {
        return taxonomySchemeService.listSubscriptions(workspaceId);
    }

    @PutMapping
    public List<TaxonomySchemeResponse> replace(
            @CurrentWorkspace Long workspaceId,
            @Valid @RequestBody WorkspaceTaxonomySchemeSelectionRequest request) {
        return taxonomySchemeService.replaceSubscriptions(workspaceId, request);
    }
}
