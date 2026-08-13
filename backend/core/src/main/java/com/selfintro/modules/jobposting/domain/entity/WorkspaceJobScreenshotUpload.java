package com.selfintro.modules.jobposting.domain.entity;

import com.selfintro.modules.jobposting.domain.enums.WorkspaceJobScreenshotUploadStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "workspace_job_screenshot_upload")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspaceJobScreenshotUpload {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "workspace_id", nullable = false, updatable = false)
    private Long workspaceId;

    @Column(name = "object_key", nullable = false, updatable = false, length = 500)
    private String objectKey;

    @Column(name = "original_file_name", nullable = false, updatable = false, length = 255)
    private String originalFileName;

    @Column(name = "content_type", nullable = false, updatable = false, length = 100)
    private String contentType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WorkspaceJobScreenshotUploadStatus status;

    @Column(name = "expires_at", nullable = false, updatable = false)
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public static WorkspaceJobScreenshotUpload issue(
            Long workspaceId,
            String objectKey,
            String originalFileName,
            String contentType,
            LocalDateTime now,
            LocalDateTime expiresAt) {
        WorkspaceJobScreenshotUpload upload = new WorkspaceJobScreenshotUpload();
        upload.id = UUID.randomUUID().toString();
        upload.workspaceId = workspaceId;
        upload.objectKey = objectKey;
        upload.originalFileName = originalFileName;
        upload.contentType = contentType;
        upload.status = WorkspaceJobScreenshotUploadStatus.PENDING;
        upload.createdAt = now;
        upload.expiresAt = expiresAt;
        return upload;
    }

    public void startProcessing(LocalDateTime now) {
        if (status != WorkspaceJobScreenshotUploadStatus.PENDING || !expiresAt.isAfter(now)) {
            throw new IllegalStateException("만료되었거나 이미 사용한 스크린샷입니다.");
        }
        status = WorkspaceJobScreenshotUploadStatus.PROCESSING;
    }

    public void markDeleted(LocalDateTime now) {
        status = WorkspaceJobScreenshotUploadStatus.DELETED;
        deletedAt = now;
    }
}
