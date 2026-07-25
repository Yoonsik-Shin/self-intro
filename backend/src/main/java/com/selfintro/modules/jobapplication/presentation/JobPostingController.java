package com.selfintro.modules.jobapplication.presentation;

import com.selfintro.modules.jobapplication.application.JobPostingCollectorService;
import com.selfintro.modules.jobapplication.application.JobPostingCollectorService.JobPostingCollectionResult;
import com.selfintro.modules.jobapplication.application.JobPostingService;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationUrlParseRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingCandidateResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingSettingRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingSettingResponse;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/admin/job-postings")
@RequiredArgsConstructor
public class JobPostingController {

    private final JobPostingService jobPostingService;
    private final JobPostingCollectorService jobPostingCollectorService;

    @GetMapping
    public List<JobPostingCandidateResponse> list() {
        return jobPostingService.list();
    }

    @GetMapping("/settings")
    public JobPostingSettingResponse getSettings() {
        return jobPostingService.getSettings();
    }

    @PutMapping("/settings")
    public JobPostingSettingResponse updateSettings(
            @Valid @RequestBody JobPostingSettingRequest request) {
        return jobPostingService.updateSettings(request);
    }

    @PostMapping("/ingest-url")
    public JobPostingCandidateResponse ingestUrl(
            @Valid @RequestBody JobApplicationUrlParseRequest request) {
        return jobPostingService.ingestUrl(request.url());
    }

    @PostMapping(value = "/ingest-url/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter ingestUrlStream(@Valid @RequestBody JobApplicationUrlParseRequest request) {
        return jobPostingService.ingestUrlStream(request.url());
    }

    @PostMapping("/collect")
    public JobPostingCollectionResult collect() {
        return jobPostingCollectorService.collectNow();
    }

    @PatchMapping("/{id}/save")
    public ResponseEntity<Void> save(@PathVariable Long id) {
        jobPostingService.save(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/dismiss")
    public ResponseEntity<Void> dismiss(@PathVariable Long id) {
        jobPostingService.dismiss(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/convert-to-application")
    public JobApplicationResponse convertToApplication(@PathVariable Long id) {
        return jobPostingService.convertToApplication(id);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<String> handleNotFound(EntityNotFoundException exception) {
        return ResponseEntity.notFound().build();
    }
}
