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
}
