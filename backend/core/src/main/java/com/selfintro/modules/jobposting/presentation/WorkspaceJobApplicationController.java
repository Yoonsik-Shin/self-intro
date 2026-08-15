package com.selfintro.modules.jobposting.presentation;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.jobposting.application.WorkspaceJobApplicationService;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCatalogResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobApplicationRequest;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobApplicationStatusEventResponse;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobApplicationStatusRequest;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobMapSettingRequest;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobMapSettingResponse;
import com.selfintro.modules.jobposting.presentation.dto.WorkspacePrivateJobPostingRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/job-applications/manage")
@RequiredArgsConstructor
public class WorkspaceJobApplicationController {

    private final WorkspaceJobApplicationService workspaceJobApplicationService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @GetMapping
    public List<JobPostingResponse> list(
            Authentication authentication, @PathVariable String workspaceSlug) {
        return workspaceJobApplicationService.list(readWorkspaceId(authentication, workspaceSlug));
    }

    @GetMapping("/catalog")
    public List<JobPostingCatalogResponse> catalog(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @RequestParam(required = false) String q) {
        return workspaceJobApplicationService.catalog(
                readWorkspaceId(authentication, workspaceSlug), q);
    }

    @GetMapping("/map-setting")
    public WorkspaceJobMapSettingResponse mapSetting(
            Authentication authentication, @PathVariable String workspaceSlug) {
        return workspaceJobApplicationService.mapSetting(
                readWorkspaceId(authentication, workspaceSlug));
    }

    @PutMapping("/map-setting")
    public WorkspaceJobMapSettingResponse updateMapSetting(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody WorkspaceJobMapSettingRequest request) {
        return workspaceJobApplicationService.updateMapSetting(
                writeWorkspaceId(authentication, workspaceSlug), request);
    }

    @GetMapping("/{jobPostingId}")
    public JobPostingResponse get(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId) {
        return workspaceJobApplicationService.get(
                readWorkspaceId(authentication, workspaceSlug), jobPostingId);
    }

    @PostMapping("/{jobPostingId}")
    public JobPostingResponse save(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId,
            @Valid @RequestBody WorkspaceJobApplicationRequest request) {
        return workspaceJobApplicationService.save(
                writeWorkspaceId(authentication, workspaceSlug), jobPostingId, request);
    }

    @PostMapping("/private-sources")
    public JobPostingResponse createPrivateSource(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody WorkspacePrivateJobPostingRequest request) {
        return workspaceJobApplicationService.createPrivateSource(
                writeWorkspaceId(authentication, workspaceSlug), request);
    }

    @PutMapping("/{jobPostingId}")
    public JobPostingResponse update(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId,
            @Valid @RequestBody WorkspaceJobApplicationRequest request) {
        return workspaceJobApplicationService.update(
                writeWorkspaceId(authentication, workspaceSlug), jobPostingId, request);
    }

    @PatchMapping("/{jobPostingId}/status")
    public JobPostingResponse changeStatus(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId,
            @Valid @RequestBody WorkspaceJobApplicationStatusRequest request) {
        return workspaceJobApplicationService.changeStatus(
                writeWorkspaceId(authentication, workspaceSlug), jobPostingId, request);
    }

    @GetMapping("/{jobPostingId}/status-events")
    public List<WorkspaceJobApplicationStatusEventResponse> statusEvents(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId) {
        return workspaceJobApplicationService.statusEvents(
                readWorkspaceId(authentication, workspaceSlug), jobPostingId);
    }

    @DeleteMapping("/{jobPostingId}")
    public ResponseEntity<Void> remove(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId) {
        workspaceJobApplicationService.remove(
                writeWorkspaceId(authentication, workspaceSlug), jobPostingId);
        return ResponseEntity.noContent().build();
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
