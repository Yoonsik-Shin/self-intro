package com.selfintro.modules.learningresource.presentation;

import com.selfintro.modules.learningresource.application.LearningResourceService;
import com.selfintro.modules.learningresource.domain.enums.LearningResourcePriorityTier;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceStatus;
import com.selfintro.modules.learningresource.domain.enums.LearningResourceType;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourceGraphResponse;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourcePageResponse;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourceRequest;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourceResponse;
import com.selfintro.modules.learningresource.presentation.dto.LearningResourceStatusRequest;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class LearningResourceController {

    private final LearningResourceService learningResourceService;

    @GetMapping("/api/admin/learning-resources")
    public LearningResourcePageResponse searchAdmin(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long taxonomyNodeId,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) List<Long> skillIds,
            @RequestParam(required = false) LearningResourceType resourceType,
            @RequestParam(required = false) LearningResourceStatus status,
            @RequestParam(required = false) LearningResourcePriorityTier priorityTier,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        return learningResourceService.searchAdmin(
                q, taxonomyNodeId, tags, skillIds, resourceType, status, priorityTier, page, size);
    }

    @GetMapping("/api/admin/learning-resources/{id}")
    public LearningResourceResponse get(@PathVariable Long id) {
        return learningResourceService.get(id);
    }

    @GetMapping("/api/admin/learning-resources/graph")
    public LearningResourceGraphResponse graph() {
        return learningResourceService.findGraph();
    }

    @PostMapping("/api/admin/learning-resources")
    public ResponseEntity<LearningResourceResponse> create(
            @Valid @RequestBody LearningResourceRequest request) {
        LearningResourceResponse response = learningResourceService.create(request);
        return ResponseEntity.created(URI.create("/api/admin/learning-resources/" + response.id()))
                .body(response);
    }

    @PutMapping("/api/admin/learning-resources/{id}")
    public LearningResourceResponse update(
            @PathVariable Long id, @Valid @RequestBody LearningResourceRequest request) {
        return learningResourceService.update(id, request);
    }

    @DeleteMapping("/api/admin/learning-resources/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        learningResourceService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/api/admin/learning-resources/{id}/status")
    public LearningResourceResponse updateStatus(
            @PathVariable Long id, @Valid @RequestBody LearningResourceStatusRequest request) {
        return learningResourceService.updateStatus(id, request.status());
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Void> handleNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleBadRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(exception.getMessage());
    }
}
