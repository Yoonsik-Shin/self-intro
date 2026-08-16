package com.selfintro.modules.storage.application;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Collection;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class StorageService {

    private static final long MAX_PDF_ARTIFACT_BYTES = 25L * 1024 * 1024;

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

    /** 업로드 완료 콜백에서 객체 저장소의 실제 PDF 바이트를 검증한다. 클라이언트가 전달한 파일명이나 해시를 신뢰하지 않는다. */
    public VerifiedPdf verifyOwnedPdf(Long workspaceId, ImageScope scope, String objectKey) {
        requireOwnedObjectKey(workspaceId, scope, objectKey);
        ObjectStoragePort.ObjectMetadata metadata = objectStoragePort.stat(objectKey);
        if (metadata.contentLength() <= 0 || metadata.contentLength() > MAX_PDF_ARTIFACT_BYTES) {
            throw new IllegalArgumentException("PDF 파일 크기는 1byte 이상 25MB 이하여야 합니다.");
        }
        if (!"application/pdf".equalsIgnoreCase(metadata.contentType())) {
            throw new IllegalArgumentException("객체 저장소에서 PDF 형식을 확인할 수 없습니다.");
        }

        byte[] content = objectStoragePort.read(objectKey, MAX_PDF_ARTIFACT_BYTES);
        if (content.length != metadata.contentLength()) {
            throw new IllegalArgumentException("PDF 객체 크기가 업로드 메타데이터와 일치하지 않습니다.");
        }
        if (content.length < 5
                || content[0] != '%'
                || content[1] != 'P'
                || content[2] != 'D'
                || content[3] != 'F'
                || content[4] != '-') {
            throw new IllegalArgumentException("유효한 PDF 파일 헤더가 아닙니다.");
        }
        return new VerifiedPdf(sha256(content), metadata.contentLength(), metadata.contentType());
    }

    private String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 해시 알고리즘을 사용할 수 없습니다.", exception);
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

    public record VerifiedPdf(String sha256Checksum, long contentLength, String contentType) {}
}
