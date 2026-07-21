package com.selfintro.modules.storage.presentation;

import com.selfintro.modules.storage.application.StorageService;
import com.selfintro.modules.storage.presentation.dto.PresignedUploadRequest;
import com.selfintro.modules.storage.presentation.dto.PresignedUploadResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ImageUploadController {

    private final StorageService storageService;

    @PostMapping("/api/admin/images/presigned-upload")
    public PresignedUploadResponse presignUpload(
            @Valid @RequestBody PresignedUploadRequest request) {
        StorageService.PresignedUpload presigned =
                storageService.presignUpload(
                        request.scope(), request.fileName(), request.contentType());
        return new PresignedUploadResponse(
                presigned.objectKey(), presigned.uploadUrl(), presigned.publicUrl());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleBadRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(exception.getMessage());
    }
}
