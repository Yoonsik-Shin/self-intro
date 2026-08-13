package com.selfintro.modules.storage.presentation;

import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.storage.application.ImageScope;
import com.selfintro.modules.storage.application.StorageService;
import com.selfintro.modules.storage.presentation.dto.PresignedUploadRequest;
import com.selfintro.modules.storage.presentation.dto.PresignedUploadResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ImageUploadController {

    private final StorageService storageService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;

    @PostMapping("/api/workspaces/{workspaceSlug}/images/presigned-upload")
    public PresignedUploadResponse workspacePresignUpload(
            @PathVariable String workspaceSlug,
            @Valid @RequestBody PresignedUploadRequest request,
            Authentication authentication) {
        Long workspaceId =
                workspaceAccessPolicy
                        .requireAnyRole(
                                authentication,
                                workspaceSlug,
                                WorkspaceRole.OWNER,
                                WorkspaceRole.ADMIN,
                                WorkspaceRole.EDITOR)
                        .getWorkspace()
                        .getId();
        if (request.scope() == ImageScope.WORKSPACE_JOB_POSTING_SCREENSHOT_TEMP
                || request.scope() == ImageScope.JOB_POSTING_SCREENSHOT) {
            throw new IllegalArgumentException("공고 스크린샷은 전용 임시 업로드 API를 사용해야 합니다.");
        }
        return presign(workspaceId, request);
    }

    private PresignedUploadResponse presign(Long workspaceId, PresignedUploadRequest request) {
        StorageService.PresignedUpload presigned =
                storageService.presignUpload(
                        workspaceId, request.scope(), request.fileName(), request.contentType());
        return new PresignedUploadResponse(
                presigned.objectKey(), presigned.uploadUrl(), presigned.publicUrl());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleBadRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(exception.getMessage());
    }
}
