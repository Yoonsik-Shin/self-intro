package com.selfintro.jobposting;

import com.selfintro.modules.jobposting.application.WorkspaceJobScreenshotUploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class WorkspaceJobScreenshotCleanupScheduler {

    private final WorkspaceJobScreenshotUploadService uploadService;

    @Scheduled(
            fixedDelayString =
                    "${app.job-posting.workspace-screenshot-cleanup-delay-millis:600000}")
    public void cleanupExpired() {
        int deleted = uploadService.cleanupExpired();
        if (deleted > 0) {
            log.info("만료된 Workspace 공고 스크린샷 임시 파일 {}개를 삭제했습니다.", deleted);
        }
    }
}
