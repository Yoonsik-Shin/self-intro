package com.selfintro.modules.experience.presentation;

import com.selfintro.modules.experience.application.ExperienceService;
import com.selfintro.modules.experience.presentation.dto.ExperienceRequest;
import com.selfintro.modules.experience.presentation.dto.ExperienceResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/experiences")
@RequiredArgsConstructor
public class ExperienceController {

    private final ExperienceService experienceService;

    @GetMapping
    public ResponseEntity<List<ExperienceResponse>> list() {
        List<ExperienceResponse> responses =
                experienceService.getAllExperiences().stream()
                        .map(experienceService::toResponse)
                        .toList();
        return ResponseEntity.ok(responses);
    }

    @PostMapping
    public ResponseEntity<ExperienceResponse> create(
            @Valid @RequestBody ExperienceRequest request) {
        return ResponseEntity.ok(experienceService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExperienceResponse> update(
            @PathVariable Long id, @Valid @RequestBody ExperienceRequest request) {
        return ResponseEntity.ok(experienceService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        experienceService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle-timeline")
    public ResponseEntity<ExperienceResponse> toggleTimeline(@PathVariable Long id) {
        return ResponseEntity.ok(experienceService.toggleTimeline(id));
    }

    @PostMapping("/batch-timeline-show")
    public ResponseEntity<List<ExperienceResponse>> batchTimelineShow(@RequestBody List<Long> ids) {
        return ResponseEntity.ok(experienceService.batchChangeTimeline(ids, true));
    }

    @PostMapping("/batch-timeline-hide")
    public ResponseEntity<List<ExperienceResponse>> batchTimelineHide(@RequestBody List<Long> ids) {
        return ResponseEntity.ok(experienceService.batchChangeTimeline(ids, false));
    }

    @PostMapping("/reorder")
    public ResponseEntity<List<ExperienceResponse>> reorder(@RequestBody List<Long> orderedIds) {
        return ResponseEntity.ok(experienceService.reorder(orderedIds));
    }
}
