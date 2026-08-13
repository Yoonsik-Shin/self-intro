package com.selfintro.modules.storage.application;

import java.time.Duration;
import java.time.LocalDate;
import java.util.Collection;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class StorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of("image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf");

    private final ObjectStoragePort objectStoragePort;
    private final long presignedUploadTtlSeconds;

    public StorageService(
            ObjectStoragePort objectStoragePort,
            @Value("${app.storage.presigned-upload-ttl-seconds:300}")
                    long presignedUploadTtlSeconds) {
        this.objectStoragePort = objectStoragePort;
        this.presignedUploadTtlSeconds = presignedUploadTtlSeconds;
    }

    public PresignedUpload presignUpload(
            Long workspaceId, ImageScope scope, String fileName, String contentType) {
        if (workspaceId == null || workspaceId <= 0) {
            throw new IllegalArgumentException("유효한 Workspace가 필요합니다.");
        }
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("허용되지 않는 이미지 형식입니다: " + contentType);
        }

        String objectKey =
                buildObjectKey(workspaceId, scope, extractExtension(fileName, contentType));

        ObjectStoragePort.PresignedObject presigned =
                objectStoragePort.presignPut(
                        objectKey, contentType, Duration.ofSeconds(presignedUploadTtlSeconds));
        return new PresignedUpload(objectKey, presigned.uploadUrl(), presigned.publicUrl());
    }

    public void delete(String objectKey) {
        objectStoragePort.delete(objectKey);
    }

    public void deleteAll(Collection<String> objectKeys) {
        objectStoragePort.deleteAll(objectKeys);
    }

    public String toPublicUrl(String objectKey) {
        return objectStoragePort.publicUrl(objectKey);
    }

    public void requireOwnedObjectKey(Long workspaceId, String objectKey) {
        String expectedPrefix = "workspaces/" + workspaceId + "/";
        if (objectKey == null || !objectKey.startsWith(expectedPrefix)) {
            throw new IllegalArgumentException("Workspace 소유 파일이 아닙니다.");
        }
    }

    public void requireOwnedObjectKey(Long workspaceId, ImageScope scope, String objectKey) {
        String expectedPrefix = "workspaces/" + workspaceId + "/" + scope.prefix() + "/";
        if (objectKey == null || !objectKey.startsWith(expectedPrefix)) {
            throw new IllegalArgumentException("Workspace의 허용된 파일 영역이 아닙니다.");
        }
    }

    private String buildObjectKey(Long workspaceId, ImageScope scope, String extension) {
        LocalDate now = LocalDate.now();
        return "workspaces/%d/%s/%04d/%02d/%s%s"
                .formatted(
                        workspaceId,
                        scope.prefix(),
                        now.getYear(),
                        now.getMonthValue(),
                        UUID.randomUUID(),
                        extension);
    }

    private String extractExtension(String fileName, String contentType) {
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex >= 0) {
            String extension = fileName.substring(dotIndex).toLowerCase(Locale.ROOT);
            if (Set.of(".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf").contains(extension)) {
                return extension;
            }
        }
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            case "application/pdf" -> ".pdf";
            default -> "";
        };
    }

    public record PresignedUpload(String objectKey, String uploadUrl, String publicUrl) {}
}
