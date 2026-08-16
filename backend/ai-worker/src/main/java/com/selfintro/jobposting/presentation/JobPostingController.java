package com.selfintro.jobposting.presentation;

import com.selfintro.jobposting.application.JobApplicationUrlParseService;
import com.selfintro.jobposting.application.JobPostingBackfillService;
import com.selfintro.jobposting.application.JobPostingBackfillService.JobPostingBackfillResult;
import com.selfintro.jobposting.application.JobPostingCollectorService;
import com.selfintro.jobposting.application.JobPostingCollectorService.JobPostingCollectionResult;
import com.selfintro.jobposting.application.JobPostingService;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationUrlParseRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationUrlParseResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingBulkIngestRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingImageIngestRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/internal/admin/job-postings")
@RequiredArgsConstructor
public class JobPostingController {

    private final JobPostingService jobPostingService;
    private final JobPostingCollectorService jobPostingCollectorService;
    private final JobApplicationUrlParseService urlParseService;
    private final JobPostingBackfillService backfillService;

    @PostMapping("/parse-url")
    public JobApplicationUrlParseResponse parseUrl(
            @Valid @RequestBody JobApplicationUrlParseRequest request) {
        return urlParseService.parse(request.url());
    }

    @PostMapping(value = "/parse-url/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter parseUrlStream(@Valid @RequestBody JobApplicationUrlParseRequest request) {
        return urlParseService.parseStream(request.url());
    }

    @PostMapping("/ingest-url")
    public JobPostingResponse ingestUrl(@Valid @RequestBody JobApplicationUrlParseRequest request) {
        return jobPostingService.ingestUrl(request.url());
    }

    @PostMapping(value = "/ingest-url/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter ingestUrlStream(@Valid @RequestBody JobApplicationUrlParseRequest request) {
        return jobPostingService.ingestUrlStream(request.url());
    }

    @PostMapping(value = "/ingest-images/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter ingestImagesStream(@Valid @RequestBody JobPostingImageIngestRequest request) {
        return jobPostingService.ingestImagesStream(request.images(), request.sourceUrl());
    }

    @PostMapping(value = "/ingest-urls/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter ingestUrlsStream(@Valid @RequestBody JobPostingBulkIngestRequest request) {
        return jobPostingService.ingestUrlsStream(request.rows());
    }

    @PostMapping("/{id}/refresh")
    public JobPostingResponse refresh(@PathVariable Long id) {
        return jobPostingService.refresh(id);
    }

    @PostMapping("/refresh-all")
    public JobPostingService.JobPostingBulkRefreshResult refreshAll(
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "true")
                    boolean onlyActive) {
        return jobPostingService.refreshAll(onlyActive);
    }

    @PostMapping(value = "/refresh-all/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter refreshAllStream(
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "true")
                    boolean onlyActive) {
        return jobPostingService.refreshAllStream(onlyActive);
    }

    @PostMapping("/collect")
    public JobPostingCollectionResult collect() {
        return jobPostingCollectorService.collectNow();
    }

    @PostMapping("/backfill-source-urls")
    public JobPostingBackfillResult backfillSourceUrls() {
        return backfillService.run();
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<String> handleNotFound(EntityNotFoundException exception) {
        return ResponseEntity.notFound().build();
    }
}
