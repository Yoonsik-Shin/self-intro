package com.selfintro.modules.jobposting.presentation;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.jobposting.application.WorkspaceJobScreenshotUploadService;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobScreenshotUploadRequest;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobScreenshotUploadResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/job-applications/manage/private-sources/screenshots/uploads")
@RequiredArgsConstructor
public class WorkspaceJobScreenshotController {

    private final WorkspaceJobScreenshotUploadService uploadService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @PostMapping
    public WorkspaceJobScreenshotUploadResponse issue(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody WorkspaceJobScreenshotUploadRequest request) {
        return uploadService.issue(writeWorkspaceId(authentication, workspaceSlug), request);
    }

    @DeleteMapping("/{uploadId}")
    public ResponseEntity<Void> cancel(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable String uploadId) {
        uploadService.cancel(writeWorkspaceId(authentication, workspaceSlug), uploadId);
        return ResponseEntity.noContent().build();
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
