package com.selfintro.modules.jobposting.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.web.WorkspaceAccessLevel;
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

    @GetMapping
    public List<JobPostingResponse> list(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId) {
        return workspaceJobApplicationService.list(workspaceId);
    }

    @GetMapping("/catalog")
    public org.springframework.data.domain.Page<JobPostingCatalogResponse> catalog(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId,
            @RequestParam(required = false) String q,
            @org.springframework.data.web.PageableDefault(
                            size = 20,
                            sort = "createdAt",
                            direction = org.springframework.data.domain.Sort.Direction.DESC)
                    org.springframework.data.domain.Pageable pageable) {
        return workspaceJobApplicationService.catalog(workspaceId, q, pageable);
    }

    @GetMapping("/map-setting")
    public WorkspaceJobMapSettingResponse mapSetting(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId) {
        return workspaceJobApplicationService.mapSetting(workspaceId);
    }

    @PutMapping("/map-setting")
    public WorkspaceJobMapSettingResponse updateMapSetting(
            @CurrentWorkspace Long workspaceId,
            @Valid @RequestBody WorkspaceJobMapSettingRequest request) {
        return workspaceJobApplicationService.updateMapSetting(workspaceId, request);
    }

    @GetMapping("/{jobPostingId}")
    public JobPostingResponse get(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId,
            @PathVariable Long jobPostingId) {
        return workspaceJobApplicationService.get(workspaceId, jobPostingId);
    }

    @PostMapping("/{jobPostingId}")
    public JobPostingResponse save(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long jobPostingId,
            @Valid @RequestBody WorkspaceJobApplicationRequest request) {
        return workspaceJobApplicationService.save(workspaceId, jobPostingId, request);
    }

    @PostMapping("/private-sources")
    public JobPostingResponse createPrivateSource(
            @CurrentWorkspace Long workspaceId,
            @Valid @RequestBody WorkspacePrivateJobPostingRequest request) {
        return workspaceJobApplicationService.createPrivateSource(workspaceId, request);
    }

    @PutMapping("/{jobPostingId}")
    public JobPostingResponse update(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long jobPostingId,
            @Valid @RequestBody WorkspaceJobApplicationRequest request) {
        return workspaceJobApplicationService.update(workspaceId, jobPostingId, request);
    }

    @PatchMapping("/{jobPostingId}/status")
    public JobPostingResponse changeStatus(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long jobPostingId,
            @Valid @RequestBody WorkspaceJobApplicationStatusRequest request) {
        return workspaceJobApplicationService.changeStatus(workspaceId, jobPostingId, request);
    }

    @GetMapping("/{jobPostingId}/status-events")
    public List<WorkspaceJobApplicationStatusEventResponse> statusEvents(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) Long workspaceId,
            @PathVariable Long jobPostingId) {
        return workspaceJobApplicationService.statusEvents(workspaceId, jobPostingId);
    }

    @DeleteMapping("/{jobPostingId}")
    public ResponseEntity<Void> remove(
            @CurrentWorkspace Long workspaceId,
            @PathVariable Long jobPostingId) {
        workspaceJobApplicationService.remove(workspaceId, jobPostingId);
        return ResponseEntity.noContent().build();
    }
}
