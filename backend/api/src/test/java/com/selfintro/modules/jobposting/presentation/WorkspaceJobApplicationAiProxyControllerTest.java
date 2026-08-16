package com.selfintro.modules.jobposting.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.Workspace;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.jobposting.application.WorkspaceJobScreenshotUploadService;
import com.selfintro.modules.jobposting.application.WorkspaceJobScreenshotUploadService.ClaimedUpload;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationImageParseRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationUrlParseRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationUrlParseResponse;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobScreenshotParseRequest;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

class WorkspaceJobApplicationAiProxyControllerTest {

    private AiWorkerClient aiWorkerClient;
    private WorkspaceAccessPolicy accessPolicy;
    private WorkspaceJobScreenshotUploadService screenshotService;
    private WorkspaceJobApplicationAiProxyController controller;
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        aiWorkerClient = mock(AiWorkerClient.class);
        accessPolicy = mock(WorkspaceAccessPolicy.class);
        screenshotService = mock(WorkspaceJobScreenshotUploadService.class);
        authentication = mock(Authentication.class);
        controller =
                new WorkspaceJobApplicationAiProxyController(
                        aiWorkerClient, accessPolicy, screenshotService);
    }

    @Test
    void parseUrlDelegatesToWorker() {
        allowWrite(42L);
        JobApplicationUrlParseRequest request =
                new JobApplicationUrlParseRequest("https://example.com/job");
        JobApplicationUrlParseResponse expected =
                new JobApplicationUrlParseResponse(
                        "Company",
                        "Engineer",
                        "Source",
                        null,
                        false,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        "https://example.com/job",
                        List.of());

        when(aiWorkerClient.post(
                        eq("/internal/workspaces/42/job-applications/manage/parse-url"),
                        eq(request),
                        eq(JobApplicationUrlParseResponse.class)))
                .thenReturn(expected);

        JobApplicationUrlParseResponse response =
                controller.parseUrl(authentication, "w-demo", request);

        assertThat(response).isEqualTo(expected);
    }

    @Test
    void parseScreenshotsClaimsUploadsCallsWorkerAndDeletesClaimed() {
        allowWrite(42L);
        ClaimedUpload upload = new ClaimedUpload("ticket-1", "private-key", "image/png");
        when(screenshotService.claim(42L, List.of("ticket-1"))).thenReturn(List.of(upload));
        when(screenshotService.read(upload)).thenReturn(new byte[] {1, 2, 3});

        JobApplicationUrlParseResponse expected =
                new JobApplicationUrlParseResponse(
                        "Company",
                        "Engineer",
                        "Source",
                        null,
                        false,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        List.of());

        when(aiWorkerClient.post(
                        eq("/internal/workspaces/42/job-applications/manage/parse-images"),
                        any(JobApplicationImageParseRequest.class),
                        eq(JobApplicationUrlParseResponse.class)))
                .thenReturn(expected);

        JobApplicationUrlParseResponse response =
                controller.parseScreenshots(
                        authentication,
                        "w-demo",
                        new WorkspaceJobScreenshotParseRequest(List.of("ticket-1")));

        assertThat(response).isEqualTo(expected);
        verify(screenshotService).deleteClaimed(42L, List.of(upload));
    }

    @Test
    void parseScreenshotsDeletesClaimedEvenWhenWorkerFails() {
        allowWrite(42L);
        ClaimedUpload upload = new ClaimedUpload("ticket-1", "private-key", "image/png");
        when(screenshotService.claim(42L, List.of("ticket-1"))).thenReturn(List.of(upload));
        when(screenshotService.read(upload)).thenReturn(new byte[] {1, 2, 3});

        when(aiWorkerClient.post(
                        eq("/internal/workspaces/42/job-applications/manage/parse-images"),
                        any(JobApplicationImageParseRequest.class),
                        eq(JobApplicationUrlParseResponse.class)))
                .thenThrow(new IllegalStateException("Worker down"));

        assertThatThrownBy(
                        () ->
                                controller.parseScreenshots(
                                        authentication,
                                        "w-demo",
                                        new WorkspaceJobScreenshotParseRequest(
                                                List.of("ticket-1"))))
                .isInstanceOf(IllegalStateException.class);

        verify(screenshotService).deleteClaimed(42L, List.of(upload));
    }

    private void allowWrite(Long workspaceId) {
        Workspace workspace = mock(Workspace.class);
        WorkspaceMember member = mock(WorkspaceMember.class);
        when(workspace.getId()).thenReturn(workspaceId);
        when(member.getWorkspace()).thenReturn(workspace);
        when(accessPolicy.requireAnyRole(
                        authentication,
                        "w-demo",
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR))
                .thenReturn(member);
    }
}
