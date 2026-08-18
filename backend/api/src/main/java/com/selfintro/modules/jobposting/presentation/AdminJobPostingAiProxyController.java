package com.selfintro.modules.jobposting.presentation;

import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationUrlParseRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobApplicationUrlParseResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingBulkIngestRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingImageIngestRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/admin/job-postings")
@RequiredArgsConstructor
public class AdminJobPostingAiProxyController {

    private final AiWorkerClient aiWorkerClient;

    @PostMapping("/parse-url")
    public JobApplicationUrlParseResponse parseUrl(
            @Valid @RequestBody JobApplicationUrlParseRequest request) {
        return aiWorkerClient.post(
                "/internal/admin/job-postings/parse-url",
                request,
                JobApplicationUrlParseResponse.class);
    }

    @PostMapping(value = "/parse-url/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody parseUrlStream(
            @Valid @RequestBody JobApplicationUrlParseRequest request) {
        return outputStream ->
                aiWorkerClient.pipePost(
                        "/internal/admin/job-postings/parse-url/stream", request, outputStream);
    }

    @PostMapping("/ingest-url")
    public JobPostingResponse ingestUrl(@Valid @RequestBody JobApplicationUrlParseRequest request) {
        return aiWorkerClient.post(
                "/internal/admin/job-postings/ingest-url", request, JobPostingResponse.class);
    }

    @PostMapping(value = "/ingest-url/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody ingestUrlStream(
            @Valid @RequestBody JobApplicationUrlParseRequest request) {
        return outputStream ->
                aiWorkerClient.pipePost(
                        "/internal/admin/job-postings/ingest-url/stream", request, outputStream);
    }

    @PostMapping(value = "/ingest-images/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody ingestImagesStream(
            @Valid @RequestBody JobPostingImageIngestRequest request) {
        return outputStream ->
                aiWorkerClient.pipePost(
                        "/internal/admin/job-postings/ingest-images/stream", request, outputStream);
    }

    @PostMapping(value = "/ingest-urls/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody ingestUrlsStream(
            @Valid @RequestBody JobPostingBulkIngestRequest request) {
        return outputStream ->
                aiWorkerClient.pipePost(
                        "/internal/admin/job-postings/ingest-urls/stream", request, outputStream);
    }

    @PostMapping("/{id}/refresh")
    public JobPostingResponse refresh(@PathVariable Long id) {
        return aiWorkerClient.post(
                "/internal/admin/job-postings/" + id + "/refresh", null, JobPostingResponse.class);
    }

    @PostMapping("/refresh-all")
    public Map<String, Object> refreshAll(@RequestParam(defaultValue = "true") boolean onlyActive) {
        return aiWorkerClient.post(
                "/internal/admin/job-postings/refresh-all?onlyActive=" + onlyActive,
                null,
                Map.class);
    }

    @PostMapping(value = "/refresh-all/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody refreshAllStream(
            @RequestParam(defaultValue = "true") boolean onlyActive) {
        return outputStream ->
                aiWorkerClient.pipePost(
                        "/internal/admin/job-postings/refresh-all/stream?onlyActive=" + onlyActive,
                        null,
                        outputStream);
    }

    @PostMapping("/collect")
    public Map<String, Object> collect() {
        return aiWorkerClient.post("/internal/admin/job-postings/collect", null, Map.class);
    }

    @PostMapping("/backfill-source-urls")
    public Map<String, Object> backfillSourceUrls() {
        return aiWorkerClient.post(
                "/internal/admin/job-postings/backfill-source-urls", null, Map.class);
    }
}
