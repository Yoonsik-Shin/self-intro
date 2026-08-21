package com.selfintro.modules.jobposting.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.aiusage.application.AiExecutionService;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import com.selfintro.modules.jobposting.application.WorkspaceJobScreenshotUploadService;
import com.selfintro.modules.jobposting.application.WorkspaceJobScreenshotUploadService.ClaimedUpload;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationImageParseRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationUrlParseRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationUrlParseResponse;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobScreenshotParseRequest;
import java.util.List;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class WorkspaceJobApplicationAiProxyControllerTest {

    private AiWorkerClient aiWorkerClient;
    private WorkspaceJobScreenshotUploadService screenshotService;
    private AiExecutionService aiExecutionService;
    private WorkspaceMember member;
    private WorkspaceJobApplicationAiProxyController controller;

    @BeforeEach
    void setUp() {
        aiWorkerClient = mock(AiWorkerClient.class);
        screenshotService = mock(WorkspaceJobScreenshotUploadService.class);
        aiExecutionService = mock(AiExecutionService.class);
        member = mock(WorkspaceMember.class, RETURNS_DEEP_STUBS);
        when(member.getWorkspace().getId()).thenReturn(42L);
        when(member.getUser().getId()).thenReturn(7L);
        when(aiExecutionService.execute(any(), any()))
                .thenAnswer(invocation -> ((Supplier<?>) invocation.getArgument(1)).get());
        controller =
                new WorkspaceJobApplicationAiProxyController(
                        aiWorkerClient, aiExecutionService, screenshotService);
    }

    @Test
    void parseUrlDelegatesToWorker() {
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

        JobApplicationUrlParseResponse response = controller.parseUrl(member, null, request);

        assertThat(response).isEqualTo(expected);
    }

    @Test
    void parseScreenshotsClaimsUploadsCallsWorkerAndDeletesClaimed() {
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
                        member, null, new WorkspaceJobScreenshotParseRequest(List.of("ticket-1")));

        assertThat(response).isEqualTo(expected);
        verify(screenshotService).deleteClaimed(42L, List.of(upload));
    }

    @Test
    void parseScreenshotsDeletesClaimedEvenWhenWorkerFails() {
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
                                        member,
                                        null,
                                        new WorkspaceJobScreenshotParseRequest(
                                                List.of("ticket-1"))))
                .isInstanceOf(IllegalStateException.class);

        verify(screenshotService).deleteClaimed(42L, List.of(upload));
    }
}
