package com.selfintro.modules.storage.application;

import java.time.Duration;
import java.time.LocalDate;
import java.util.Collection;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;

@Service
public class StorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of("image/png", "image/jpeg", "image/webp", "image/gif");

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucket;
    private final long presignedUploadTtlSeconds;
    private final String publicBaseUrl;

    public StorageService(
            S3Client s3Client,
            S3Presigner s3Presigner,
            @Value("${app.storage.bucket}") String bucket,
            @Value("${app.storage.presigned-upload-ttl-seconds:300}") long presignedUploadTtlSeconds,
            @Value("${app.storage.public-base-url}") String publicBaseUrl) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.bucket = bucket;
        this.presignedUploadTtlSeconds = presignedUploadTtlSeconds;
        this.publicBaseUrl = publicBaseUrl;
    }

    public PresignedUpload presignUpload(ImageScope scope, String fileName, String contentType) {
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("허용되지 않는 이미지 형식입니다: " + contentType);
        }

        String objectKey = buildObjectKey(scope, extractExtension(fileName, contentType));

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .contentType(contentType)
                .build();

        PresignedPutObjectRequest presigned = s3Presigner.presignPutObject(builder -> builder
                .signatureDuration(Duration.ofSeconds(presignedUploadTtlSeconds))
                .putObjectRequest(putObjectRequest));

        return new PresignedUpload(objectKey, presigned.url().toString(), toPublicUrl(objectKey));
    }

    public void delete(String objectKey) {
        s3Client.deleteObject(builder -> builder.bucket(bucket).key(objectKey));
    }

    public void deleteAll(Collection<String> objectKeys) {
        objectKeys.forEach(this::delete);
    }

    public String toPublicUrl(String objectKey) {
        return publicBaseUrl + "/" + objectKey;
    }

    private String buildObjectKey(ImageScope scope, String extension) {
        LocalDate now = LocalDate.now();
        return "%s/%04d/%02d/%s%s".formatted(
                scope.prefix(), now.getYear(), now.getMonthValue(), UUID.randomUUID(), extension);
    }

    private String extractExtension(String fileName, String contentType) {
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex >= 0) {
            String extension = fileName.substring(dotIndex).toLowerCase(Locale.ROOT);
            if (Set.of(".png", ".jpg", ".jpeg", ".webp", ".gif").contains(extension)) {
                return extension;
            }
        }
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> "";
        };
    }

    public record PresignedUpload(String objectKey, String uploadUrl, String publicUrl) {
    }
}
