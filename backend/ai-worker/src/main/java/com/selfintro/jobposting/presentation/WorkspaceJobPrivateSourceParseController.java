package com.selfintro.jobposting.presentation;

import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.jobposting.application.JobApplicationUrlParseService;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationImageParseRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationUrlParseRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationUrlParseResponse;
import jakarta.validation.Valid;
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

    /** URL은 저장하지 않고 해석 결과만 반환한다. 저장은 Workspace 비공개 원본 API에서 별도로 수행한다. */
    @PostMapping("/parse-url")
    public JobApplicationUrlParseResponse parseUrl(
            @PathVariable Long workspaceId,
            @Valid @RequestBody JobApplicationUrlParseRequest request) {
        return urlParseService.parse(request.url());
    }

    /** 이미지 바이트 목록을 받아 채용공고 정보를 분석하여 반환한다. */
    @PostMapping("/parse-images")
    public JobApplicationUrlParseResponse parseImages(
            @PathVariable Long workspaceId,
            @Valid @RequestBody JobApplicationImageParseRequest request) {
        return urlParseService.parseFromImages(
                request.images().stream()
                        .map(img -> new NvidiaNimClient.ImagePart(img.bytes(), img.mimeType()))
                        .toList());
    }
}
