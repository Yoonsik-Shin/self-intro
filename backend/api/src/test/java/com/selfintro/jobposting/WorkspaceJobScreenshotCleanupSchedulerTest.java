package com.selfintro.jobposting;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.modules.jobposting.application.WorkspaceJobScreenshotUploadService;
import org.junit.jupiter.api.Test;

class WorkspaceJobScreenshotCleanupSchedulerTest {

    @Test
    void delegatesExpiredTemporaryObjectCleanup() {
        WorkspaceJobScreenshotUploadService service =
                mock(WorkspaceJobScreenshotUploadService.class);
        when(service.cleanupExpired()).thenReturn(2);
        WorkspaceJobScreenshotCleanupScheduler scheduler =
                new WorkspaceJobScreenshotCleanupScheduler(service);

        assertThatCode(scheduler::cleanupExpired).doesNotThrowAnyException();

        verify(service).cleanupExpired();
    }
}
