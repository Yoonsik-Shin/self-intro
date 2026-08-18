package com.selfintro.modules.jobposting.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.modules.jobposting.application.WorkspaceJobScreenshotUploadService;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobScreenshotUploadRequest;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobScreenshotUploadResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(
        "/api/workspaces/{workspaceSlug}/job-applications/manage/private-sources/screenshots/uploads")
@RequiredArgsConstructor
public class WorkspaceJobScreenshotController {

    private final WorkspaceJobScreenshotUploadService uploadService;

    @PostMapping
    public WorkspaceJobScreenshotUploadResponse issue(
            @CurrentWorkspace Long workspaceId,
            @Valid @RequestBody WorkspaceJobScreenshotUploadRequest request) {
        return uploadService.issue(workspaceId, request);
    }

    @DeleteMapping("/{uploadId}")
    public ResponseEntity<Void> cancel(
            @CurrentWorkspace Long workspaceId,
            @PathVariable String uploadId) {
        uploadService.cancel(workspaceId, uploadId);
        return ResponseEntity.noContent().build();
    }
}
