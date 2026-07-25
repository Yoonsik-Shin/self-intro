package com.selfintro.modules.jobapplication.presentation;

import com.selfintro.modules.jobapplication.application.JobApplicationService;
import com.selfintro.modules.jobapplication.application.JobApplicationUrlParseService;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationStageChangeRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationStageEventResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationUrlParseRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationUrlParseResponse;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/job-applications")
@RequiredArgsConstructor
public class JobApplicationController {

    private final JobApplicationService jobApplicationService;
    private final JobApplicationUrlParseService jobApplicationUrlParseService;

    @PostMapping("/parse-url")
    public JobApplicationUrlParseResponse parseUrl(
            @Valid @RequestBody JobApplicationUrlParseRequest request) {
        return jobApplicationUrlParseService.parse(request.url());
    }

    @GetMapping
    public List<JobApplicationResponse> list() {
        return jobApplicationService.list();
    }

    @GetMapping("/{id}")
    public JobApplicationResponse get(@PathVariable Long id) {
        return jobApplicationService.get(id);
    }

    @PostMapping
    public JobApplicationResponse create(@Valid @RequestBody JobApplicationRequest request) {
        return jobApplicationService.create(request);
    }

    @PutMapping("/{id}")
    public JobApplicationResponse update(
            @PathVariable Long id, @Valid @RequestBody JobApplicationRequest request) {
        return jobApplicationService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        jobApplicationService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/stage")
    public JobApplicationResponse changeStage(
            @PathVariable Long id, @Valid @RequestBody JobApplicationStageChangeRequest request) {
        return jobApplicationService.changeStage(id, request.stage(), request.memo());
    }

    @GetMapping("/{id}/stage-events")
    public List<JobApplicationStageEventResponse> stageEvents(@PathVariable Long id) {
        return jobApplicationService.stageEvents(id);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<String> handleNotFound(EntityNotFoundException exception) {
        return ResponseEntity.notFound().build();
    }
}
