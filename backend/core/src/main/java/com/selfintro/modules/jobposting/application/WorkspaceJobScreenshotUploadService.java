package com.selfintro.modules.jobposting.application;

import com.selfintro.modules.jobposting.domain.entity.WorkspaceJobScreenshotUpload;
import com.selfintro.modules.jobposting.domain.enums.WorkspaceJobScreenshotUploadStatus;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobScreenshotUploadRepository;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobScreenshotUploadRequest;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobScreenshotUploadResponse;
import com.selfintro.modules.storage.application.ImageScope;
import com.selfintro.modules.storage.application.ObjectStoragePort;
import com.selfintro.modules.storage.application.StorageService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkspaceJobScreenshotUploadService {

    private static final Set<String> ALLOWED_TYPES =
            Set.of("image/png", "image/jpeg", "image/webp");
    private static final long MAX_FILE_BYTES = 8L * 1024 * 1024;
    private static final long MAX_REQUEST_BYTES = 25L * 1024 * 1024;

    private final WorkspaceJobScreenshotUploadRepository repository;
    private final StorageService storageService;
    private final ObjectStoragePort objectStoragePort;

    @Value("${app.job-posting.workspace-screenshot-upload-ttl-minutes:30}")
    private long uploadTtlMinutes;

    @Transactional
    public WorkspaceJobScreenshotUploadResponse issue(
            Long workspaceId, WorkspaceJobScreenshotUploadRequest request) {
        validateDeclaredFile(request.contentType(), request.contentLength());
        StorageService.PresignedUpload presigned =
                storageService.presignUpload(
                        workspaceId,
                        ImageScope.WORKSPACE_JOB_POSTING_SCREENSHOT_TEMP,
                        request.fileName(),
                        request.contentType());
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusMinutes(uploadTtlMinutes);
        WorkspaceJobScreenshotUpload upload =
                repository.save(
                        WorkspaceJobScreenshotUpload.issue(
                                workspaceId,
                                presigned.objectKey(),
                                request.fileName(),
                                request.contentType(),
                                now,
                                expiresAt));
        return new WorkspaceJobScreenshotUploadResponse(
                upload.getId(), presigned.uploadUrl(), expiresAt);
    }

    @Transactional
    public List<ClaimedUpload> claim(Long workspaceId, List<String> uploadIds) {
        if (uploadIds == null || uploadIds.isEmpty() || uploadIds.size() > 5) {
            throw new IllegalArgumentException("스크린샷은 1장 이상 5장 이하만 가능합니다.");
        }
        if (uploadIds.stream().distinct().count() != uploadIds.size()) {
            throw new IllegalArgumentException("중복된 스크린샷 업로드가 포함되어 있습니다.");
        }
        LocalDateTime now = LocalDateTime.now();
        long totalBytes = 0;
        java.util.ArrayList<ClaimedUpload> claimed = new java.util.ArrayList<>();
        for (String uploadId : uploadIds) {
            WorkspaceJobScreenshotUpload upload =
                    repository
                            .findByIdAndWorkspaceId(uploadId, workspaceId)
                            .orElseThrow(
                                    () ->
                                            new IllegalArgumentException(
                                                    "현재 Workspace의 스크린샷 업로드가 아닙니다."));
            requireClaimable(upload, now);
            storageService.requireOwnedObjectKey(
                    workspaceId,
                    ImageScope.WORKSPACE_JOB_POSTING_SCREENSHOT_TEMP,
                    upload.getObjectKey());
            ObjectStoragePort.ObjectMetadata metadata;
            try {
                metadata = objectStoragePort.stat(upload.getObjectKey());
            } catch (RuntimeException exception) {
                throw new IllegalArgumentException("업로드가 완료되지 않았거나 파일을 찾을 수 없습니다.", exception);
            }
            String actualType = normalizeContentType(metadata.contentType());
            if (!ALLOWED_TYPES.contains(actualType)
                    || !actualType.equals(upload.getContentType())
                    || metadata.contentLength() <= 0
                    || metadata.contentLength() > MAX_FILE_BYTES) {
                throw new IllegalArgumentException("업로드된 이미지의 형식 또는 크기가 허용 범위를 벗어났습니다.");
            }
            totalBytes += metadata.contentLength();
            if (totalBytes > MAX_REQUEST_BYTES) {
                throw new IllegalArgumentException("스크린샷 전체 크기는 25MB 이하여야 합니다.");
            }
            upload.startProcessing(now);
            claimed.add(new ClaimedUpload(upload.getId(), upload.getObjectKey(), actualType));
        }
        return List.copyOf(claimed);
    }

    public byte[] read(ClaimedUpload upload) {
        return objectStoragePort.read(upload.objectKey(), MAX_FILE_BYTES);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void cancel(Long workspaceId, String uploadId) {
        WorkspaceJobScreenshotUpload upload =
                repository
                        .findByIdAndWorkspaceId(uploadId, workspaceId)
                        .orElseThrow(
                                () ->
                                        new IllegalArgumentException(
                                                "현재 Workspace의 스크린샷 업로드가 아닙니다."));
        if (upload.getStatus() == WorkspaceJobScreenshotUploadStatus.DELETED) return;
        storageService.requireOwnedObjectKey(
                workspaceId,
                ImageScope.WORKSPACE_JOB_POSTING_SCREENSHOT_TEMP,
                upload.getObjectKey());
        storageService.delete(upload.getObjectKey());
        upload.markDeleted(LocalDateTime.now());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deleteClaimed(Long workspaceId, List<ClaimedUpload> uploads) {
        for (ClaimedUpload claimed : uploads) {
            repository
                    .findByIdAndWorkspaceId(claimed.uploadId(), workspaceId)
                    .ifPresent(
                            upload -> {
                                try {
                                    storageService.delete(upload.getObjectKey());
                                    upload.markDeleted(LocalDateTime.now());
                                } catch (RuntimeException ignored) {
                                    // 다음 만료 정리에서 재시도한다. 키는 로그에 남기지 않는다.
                                }
                            });
        }
    }

    @Transactional
    public int cleanupExpired() {
        List<WorkspaceJobScreenshotUpload> expired =
                repository.findAllByStatusInAndExpiresAtBefore(
                        List.of(
                                WorkspaceJobScreenshotUploadStatus.PENDING,
                                WorkspaceJobScreenshotUploadStatus.PROCESSING),
                        LocalDateTime.now());
        int deleted = 0;
        for (WorkspaceJobScreenshotUpload upload : expired) {
            try {
                storageService.delete(upload.getObjectKey());
                upload.markDeleted(LocalDateTime.now());
                deleted++;
            } catch (RuntimeException ignored) {
                // 다음 스케줄에서 다시 시도한다. 키는 로그에 남기지 않는다.
            }
        }
        return deleted;
    }

    private void validateDeclaredFile(String contentType, long contentLength) {
        if (!ALLOWED_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("PNG, JPEG, WebP 이미지만 업로드할 수 있습니다.");
        }
        if (contentLength <= 0 || contentLength > MAX_FILE_BYTES) {
            throw new IllegalArgumentException("이미지 한 장은 8MB 이하여야 합니다.");
        }
    }

    private void requireClaimable(WorkspaceJobScreenshotUpload upload, LocalDateTime now) {
        if (upload.getStatus() != WorkspaceJobScreenshotUploadStatus.PENDING
                || !upload.getExpiresAt().isAfter(now)) {
            throw new IllegalArgumentException("만료되었거나 이미 사용한 스크린샷입니다.");
        }
    }

    private String normalizeContentType(String contentType) {
        if (contentType == null) return "";
        int separator = contentType.indexOf(';');
        return (separator >= 0 ? contentType.substring(0, separator) : contentType)
                .trim()
                .toLowerCase(java.util.Locale.ROOT);
    }

    public record ClaimedUpload(String uploadId, String objectKey, String contentType) {}
}
