package com.selfintro.modules.study.presentation;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.study.application.StudyService;
import com.selfintro.modules.study.domain.enums.StudySection;
import com.selfintro.modules.study.domain.enums.StudyStatus;
import com.selfintro.modules.study.presentation.dto.StudyPageResponse;
import com.selfintro.modules.study.presentation.dto.StudyRequest;
import com.selfintro.modules.study.presentation.dto.StudyResponse;
import jakarta.validation.Valid;
import java.net.URI;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/studies/manage")
@RequiredArgsConstructor
public class WorkspaceStudyManagementController {

    private final StudyService studyService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @GetMapping
    public StudyPageResponse search(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long taxonomyNodeId,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) List<Long> skillIds,
            @RequestParam(required = false) List<Long> experienceIds,
            @RequestParam(required = false) List<Long> experienceDetailIds,
            @RequestParam(required = false) StudyStatus status,
            @RequestParam(required = false) StudySection section,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        return studyService.searchAdmin(
                readWorkspaceId(authentication, workspaceSlug),
                q,
                taxonomyNodeId,
                tags,
                skillIds,
                experienceIds,
                experienceDetailIds,
                status,
                section,
                page,
                size);
    }

    @PostMapping
    public ResponseEntity<StudyResponse> create(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody StudyRequest request) {
        StudyResponse response =
                studyService.create(writeWorkspaceId(authentication, workspaceSlug), request);
        return ResponseEntity.created(
                        URI.create(
                                "/api/workspaces/" + workspaceSlug + "/studies/" + response.slug()))
                .body(response);
    }

    @PutMapping("/{id}")
    public StudyResponse update(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id,
            @Valid @RequestBody StudyRequest request) {
        return studyService.update(writeWorkspaceId(authentication, workspaceSlug), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id) {
        studyService.delete(writeWorkspaceId(authentication, workspaceSlug), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/batch-publish")
    public List<StudyResponse> batchPublish(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @RequestBody List<Long> ids) {
        return studyService.batchPublish(writeWorkspaceId(authentication, workspaceSlug), ids);
    }

    @PostMapping("/batch-unpublish")
    public List<StudyResponse> batchUnpublish(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @RequestBody List<Long> ids) {
        return studyService.batchUnpublish(writeWorkspaceId(authentication, workspaceSlug), ids);
    }

    @PostMapping("/{id}/toggle-status")
    public StudyResponse toggleStatus(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id) {
        return studyService.toggleStatus(writeWorkspaceId(authentication, workspaceSlug), id);
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
