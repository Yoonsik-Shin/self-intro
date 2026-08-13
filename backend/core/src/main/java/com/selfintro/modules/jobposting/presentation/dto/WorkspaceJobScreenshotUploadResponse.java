package com.selfintro.modules.jobposting.presentation.dto;

import java.time.LocalDateTime;

public record WorkspaceJobScreenshotUploadResponse(
        String uploadId, String uploadUrl, LocalDateTime expiresAt) {}
