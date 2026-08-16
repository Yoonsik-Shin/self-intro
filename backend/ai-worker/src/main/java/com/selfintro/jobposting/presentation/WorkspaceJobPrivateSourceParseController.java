package com.selfintro.jobposting.presentation;

import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.jobposting.application.JobApplicationUrlParseService;
import com.selfintro.modules.jobposting.application.WorkspaceJobScreenshotUploadService;
import com.selfintro.modules.jobposting.application.WorkspaceJobScreenshotUploadService.ClaimedUpload;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationUrlParseRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationUrlParseResponse;
import com.selfintro.modules.jobposting.presentation.dto.WorkspaceJobScreenshotParseRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/workspaces/{workspaceId}/job-applications/manage")
@RequiredArgsConstructor
public class WorkspaceJobPrivateSourceParseController {

    private final JobApplicationUrlParseService urlParseService;
    private final WorkspaceJobScreenshotUploadService screenshotUploadService;

    /** URL은 저장하지 않고 해석 결과만 반환한다. 저장은 Workspace 비공개 원본 API에서 별도로 수행한다. */
    @PostMapping("/parse-url")
    public JobApplicationUrlParseResponse parseUrl(
            @PathVariable Long workspaceId,
            @Valid @RequestBody JobApplicationUrlParseRequest request) {
        return urlParseService.parse(request.url());
    }

    /** 원본 이미지는 분석에만 사용하며 성공·실패와 무관하게 즉시 삭제한다. */
    @PostMapping("/parse-screenshots")
    public JobApplicationUrlParseResponse parseScreenshots(
            @PathVariable Long workspaceId,
            @Valid @RequestBody WorkspaceJobScreenshotParseRequest request) {
        List<ClaimedUpload> uploads =
                screenshotUploadService.claim(workspaceId, request.uploadIds());
        try {
            return urlParseService.parseFromImages(
                    uploads.stream()
                            .map(
                                    upload ->
                                            new NvidiaNimClient.ImagePart(
                                                    screenshotUploadService.read(upload),
                                                    upload.contentType()))
                            .toList());
        } finally {
            screenshotUploadService.deleteClaimed(workspaceId, uploads);
        }
    }
}
