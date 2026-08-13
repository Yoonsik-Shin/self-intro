package com.selfintro.modules.jobposting.domain.repository;

import com.selfintro.modules.jobposting.domain.entity.WorkspaceJobScreenshotUpload;
import com.selfintro.modules.jobposting.domain.enums.WorkspaceJobScreenshotUploadStatus;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface WorkspaceJobScreenshotUploadRepository
        extends JpaRepository<WorkspaceJobScreenshotUpload, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<WorkspaceJobScreenshotUpload> findByIdAndWorkspaceId(String id, Long workspaceId);

    List<WorkspaceJobScreenshotUpload> findAllByStatusInAndExpiresAtBefore(
            Collection<WorkspaceJobScreenshotUploadStatus> statuses, LocalDateTime expiresAt);
}
