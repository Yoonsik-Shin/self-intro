package com.selfintro.modules.jobposting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.jobposting.domain.entity.WorkspaceJobScreenshotUpload;
import com.selfintro.modules.jobposting.domain.enums.WorkspaceJobScreenshotUploadStatus;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobScreenshotUploadRepository;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobScreenshotUploadRequest;
import com.selfintro.modules.storage.application.ImageScope;
import com.selfintro.modules.storage.application.ObjectStoragePort;
import com.selfintro.modules.storage.application.StorageService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class WorkspaceJobScreenshotUploadServiceTest {

    private WorkspaceJobScreenshotUploadRepository repository;
    private StorageService storageService;
    private ObjectStoragePort objectStoragePort;
    private WorkspaceJobScreenshotUploadService service;

    @BeforeEach
    void setUp() {
        repository = mock(WorkspaceJobScreenshotUploadRepository.class);
        storageService = mock(StorageService.class);
        objectStoragePort = mock(ObjectStoragePort.class);
        service =
                new WorkspaceJobScreenshotUploadService(
                        repository, storageService, objectStoragePort);
        ReflectionTestUtils.setField(service, "uploadTtlMinutes", 30L);
    }

    @Test
    void issuesOpaqueWorkspaceTicketForAllowedImage() {
        String key = "workspaces/7/job-posting/screenshot-temp/2026/08/a.png";
        when(storageService.presignUpload(
                        7L, ImageScope.WORKSPACE_JOB_POSTING_SCREENSHOT_TEMP, "a.png", "image/png"))
                .thenReturn(new StorageService.PresignedUpload(key, "https://upload", null));
        when(repository.save(any(WorkspaceJobScreenshotUpload.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response =
                service.issue(
                        7L, new WorkspaceJobScreenshotUploadRequest("a.png", "image/png", 1024));

        assertThat(response.uploadId()).hasSize(36);
        assertThat(response.uploadUrl()).isEqualTo("https://upload");
    }

    @Test
    void claimsOnlyCurrentWorkspaceUploadAfterObjectMetadataValidation() {
        WorkspaceJobScreenshotUpload upload = upload(7L, "image/png");
        when(repository.findByIdAndWorkspaceId(upload.getId(), 7L)).thenReturn(Optional.of(upload));
        when(objectStoragePort.stat(upload.getObjectKey()))
                .thenReturn(new ObjectStoragePort.ObjectMetadata(2048, "image/png"));

        var claimed = service.claim(7L, List.of(upload.getId()));

        assertThat(claimed)
                .singleElement()
                .extracting(c -> c.objectKey())
                .isEqualTo(upload.getObjectKey());
        assertThat(upload.getStatus()).isEqualTo(WorkspaceJobScreenshotUploadStatus.PROCESSING);
        verify(storageService)
                .requireOwnedObjectKey(
                        7L,
                        ImageScope.WORKSPACE_JOB_POSTING_SCREENSHOT_TEMP,
                        upload.getObjectKey());
    }

    @Test
    void rejectsForeignWorkspaceTicketBeforeReadingStorage() {
        when(repository.findByIdAndWorkspaceId("foreign", 7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.claim(7L, List.of("foreign")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("현재 Workspace");

        verify(objectStoragePort, never()).stat(any());
    }

    @Test
    void rejectsUnsupportedDeclaredTypeBeforeIssuingPresignedUpload() {
        assertThatThrownBy(
                        () ->
                                service.issue(
                                        7L,
                                        new WorkspaceJobScreenshotUploadRequest(
                                                "notice.pdf", "application/pdf", 1024)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("PNG, JPEG, WebP");

        verify(storageService, never()).presignUpload(any(), any(), any(), any());
    }

    @Test
    void rejectsOversizedDeclaredImageBeforeIssuingPresignedUpload() {
        assertThatThrownBy(
                        () ->
                                service.issue(
                                        7L,
                                        new WorkspaceJobScreenshotUploadRequest(
                                                "large.png", "image/png", 8L * 1024 * 1024 + 1)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("8MB");

        verify(storageService, never()).presignUpload(any(), any(), any(), any());
    }

    @Test
    void rejectsExpiredTicketBeforeReadingStorage() {
        WorkspaceJobScreenshotUpload upload =
                upload(7L, "expired.png", "image/png", LocalDateTime.now().minusMinutes(1));
        when(repository.findByIdAndWorkspaceId(upload.getId(), 7L)).thenReturn(Optional.of(upload));

        assertThatThrownBy(() -> service.claim(7L, List.of(upload.getId())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("만료되었거나 이미 사용한");

        verify(storageService, never()).requireOwnedObjectKey(any(), any(), any());
        verify(objectStoragePort, never()).stat(any());
    }

    @Test
    void rejectsMetadataThatDoesNotMatchTicket() {
        WorkspaceJobScreenshotUpload upload = upload(7L, "image/png");
        when(repository.findByIdAndWorkspaceId(upload.getId(), 7L)).thenReturn(Optional.of(upload));
        when(objectStoragePort.stat(upload.getObjectKey()))
                .thenReturn(new ObjectStoragePort.ObjectMetadata(2048, "image/jpeg"));

        assertThatThrownBy(() -> service.claim(7L, List.of(upload.getId())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("형식 또는 크기");
    }

    @Test
    void rejectsCombinedImagesOverRequestLimit() {
        List<WorkspaceJobScreenshotUpload> uploads =
                List.of(
                        upload(7L, "a.png", "image/png"),
                        upload(7L, "b.png", "image/png"),
                        upload(7L, "c.png", "image/png"),
                        upload(7L, "d.png", "image/png"));
        uploads.forEach(
                upload -> {
                    when(repository.findByIdAndWorkspaceId(upload.getId(), 7L))
                            .thenReturn(Optional.of(upload));
                    when(objectStoragePort.stat(upload.getObjectKey()))
                            .thenReturn(
                                    new ObjectStoragePort.ObjectMetadata(
                                            7L * 1024 * 1024, "image/png"));
                });

        assertThatThrownBy(
                        () ->
                                service.claim(
                                        7L,
                                        uploads.stream()
                                                .map(WorkspaceJobScreenshotUpload::getId)
                                                .toList()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("전체 크기는 25MB");
    }

    @Test
    void cancelRejectsForeignWorkspaceTicketBeforeDeletingStorage() {
        when(repository.findByIdAndWorkspaceId("foreign", 7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.cancel(7L, "foreign"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("현재 Workspace");

        verify(storageService, never()).delete(any());
    }

    @Test
    void cancelDeletesObjectAndInvalidatesTicket() {
        WorkspaceJobScreenshotUpload upload = upload(7L, "image/webp");
        when(repository.findByIdAndWorkspaceId(upload.getId(), 7L)).thenReturn(Optional.of(upload));

        service.cancel(7L, upload.getId());

        verify(storageService).delete(upload.getObjectKey());
        assertThat(upload.getStatus()).isEqualTo(WorkspaceJobScreenshotUploadStatus.DELETED);
        assertThat(upload.getDeletedAt()).isNotNull();
    }

    @Test
    void analyzedUploadsAreDeletedAndInvalidated() {
        WorkspaceJobScreenshotUpload upload = upload(7L, "image/png");
        when(repository.findByIdAndWorkspaceId(upload.getId(), 7L)).thenReturn(Optional.of(upload));
        var claimed =
                new WorkspaceJobScreenshotUploadService.ClaimedUpload(
                        upload.getId(), upload.getObjectKey(), upload.getContentType());

        service.deleteClaimed(7L, List.of(claimed));

        verify(storageService).delete(upload.getObjectKey());
        assertThat(upload.getStatus()).isEqualTo(WorkspaceJobScreenshotUploadStatus.DELETED);
        assertThat(upload.getDeletedAt()).isNotNull();
    }

    @Test
    void expiredUploadCleanupLeavesFailedObjectForNextRetry() {
        WorkspaceJobScreenshotUpload deleted = upload(7L, "deleted.png", "image/png");
        WorkspaceJobScreenshotUpload retry = upload(7L, "retry.jpg", "image/jpeg");
        when(repository.findAllByStatusInAndExpiresAtBefore(any(), any(LocalDateTime.class)))
                .thenReturn(List.of(deleted, retry));
        doThrow(new IllegalStateException("temporary storage failure"))
                .when(storageService)
                .delete(retry.getObjectKey());

        assertThat(service.cleanupExpired()).isEqualTo(1);

        assertThat(deleted.getStatus()).isEqualTo(WorkspaceJobScreenshotUploadStatus.DELETED);
        assertThat(retry.getStatus()).isEqualTo(WorkspaceJobScreenshotUploadStatus.PENDING);
    }

    private WorkspaceJobScreenshotUpload upload(Long workspaceId, String contentType) {
        return upload(workspaceId, "a.png", contentType);
    }

    private WorkspaceJobScreenshotUpload upload(
            Long workspaceId, String fileName, String contentType) {
        LocalDateTime now = LocalDateTime.now();
        return upload(workspaceId, fileName, contentType, now.plusMinutes(30));
    }

    private WorkspaceJobScreenshotUpload upload(
            Long workspaceId, String fileName, String contentType, LocalDateTime expiresAt) {
        LocalDateTime now = LocalDateTime.now().minusMinutes(30);
        return WorkspaceJobScreenshotUpload.issue(
                workspaceId,
                "workspaces/" + workspaceId + "/job-posting/screenshot-temp/" + fileName,
                fileName,
                contentType,
                now,
                expiresAt);
    }
}
