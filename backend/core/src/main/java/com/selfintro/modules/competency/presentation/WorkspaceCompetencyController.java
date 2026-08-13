package com.selfintro.modules.competency.presentation;

import com.selfintro.modules.competency.application.CompetencyService;
import com.selfintro.modules.competency.presentation.dto.CompetencyRequest;
import com.selfintro.modules.competency.presentation.dto.CompetencyResponse;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/competencies")
@RequiredArgsConstructor
public class WorkspaceCompetencyController {

    private final CompetencyService competencyService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @GetMapping
    public List<CompetencyResponse> list(
            Authentication authentication, @PathVariable String workspaceSlug) {
        return competencyService.getAll(readWorkspaceId(authentication, workspaceSlug));
    }

    @PostMapping
    public CompetencyResponse create(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody CompetencyRequest request) {
        return competencyService.create(writeWorkspaceId(authentication, workspaceSlug), request);
    }

    @PutMapping("/{id}")
    public CompetencyResponse update(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id,
            @Valid @RequestBody CompetencyRequest request) {
        return competencyService.update(
                writeWorkspaceId(authentication, workspaceSlug), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id) {
        competencyService.delete(writeWorkspaceId(authentication, workspaceSlug), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reorder")
    public List<CompetencyResponse> reorder(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @RequestBody List<Long> ids) {
        return competencyService.reorder(writeWorkspaceId(authentication, workspaceSlug), ids);
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
