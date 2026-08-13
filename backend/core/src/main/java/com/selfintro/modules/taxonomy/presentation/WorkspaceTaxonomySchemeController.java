package com.selfintro.modules.taxonomy.presentation;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.taxonomy.application.TaxonomySchemeService;
import com.selfintro.modules.taxonomy.presentation.dto.TaxonomySchemeResponse;
import com.selfintro.modules.taxonomy.presentation.dto.WorkspaceTaxonomySchemeSelectionRequest;
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
@RequiredArgsConstructor
@RequestMapping("/api/workspaces/{workspaceSlug}/taxonomy-schemes")
public class WorkspaceTaxonomySchemeController {

    private final WorkspaceAccessPolicy workspaceAccessPolicy;
    private final TaxonomySchemeService taxonomySchemeService;

    @GetMapping("/catalog")
    public List<TaxonomySchemeResponse> catalog(
            Authentication authentication, @PathVariable String workspaceSlug) {
        readWorkspaceId(authentication, workspaceSlug);
        return taxonomySchemeService.listPlatformCatalog();
    }

    @GetMapping
    public List<TaxonomySchemeResponse> subscriptions(
            Authentication authentication, @PathVariable String workspaceSlug) {
        return taxonomySchemeService.listSubscriptions(
                readWorkspaceId(authentication, workspaceSlug));
    }

    @PutMapping
    public List<TaxonomySchemeResponse> replace(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody WorkspaceTaxonomySchemeSelectionRequest request) {
        return taxonomySchemeService.replaceSubscriptions(
                writeWorkspaceId(authentication, workspaceSlug), request);
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
