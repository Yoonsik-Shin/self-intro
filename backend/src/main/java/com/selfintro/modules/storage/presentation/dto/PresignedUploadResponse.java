package com.selfintro.modules.storage.presentation.dto;

public record PresignedUploadResponse(String objectKey, String uploadUrl, String publicUrl) {}
