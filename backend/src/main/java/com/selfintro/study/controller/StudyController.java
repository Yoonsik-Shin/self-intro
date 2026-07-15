package com.selfintro.study.controller;

import com.selfintro.study.dto.StudyPageResponse;
import com.selfintro.study.dto.StudyRelationRequest;
import com.selfintro.study.dto.StudyRequest;
import com.selfintro.study.dto.StudyResponse;
import com.selfintro.study.entity.StudyStatus;
import com.selfintro.study.service.StudyService;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class StudyController {

    private final StudyService studyService;

    @GetMapping("/api/studies")
    public StudyPageResponse searchPublished(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) List<Long> skillIds,
            @RequestParam(required = false) List<Long> experienceIds,
            @RequestParam(required = false) List<Long> experienceDetailIds,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return studyService.searchPublished(q, category, tags, skillIds, experienceIds, experienceDetailIds, page, size);
    }

    @GetMapping("/api/studies/{slug}")
    public StudyResponse findPublished(@PathVariable String slug) {
        return studyService.findPublishedBySlug(slug);
    }

    @GetMapping("/api/study-categories")
    public List<StudyResponse.CategoryResponse> categories() {
        return studyService.findCategories();
    }

    @GetMapping("/api/tags")
    public List<StudyResponse.TagResponse> tags() {
        return studyService.findTags();
    }

    @GetMapping("/api/admin/studies")
    public StudyPageResponse searchAdmin(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) List<Long> skillIds,
            @RequestParam(required = false) List<Long> experienceIds,
            @RequestParam(required = false) List<Long> experienceDetailIds,
            @RequestParam(required = false) StudyStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        return studyService.searchAdmin(q, category, tags, skillIds, experienceIds, experienceDetailIds, status, page, size);
    }

    @PostMapping("/api/admin/studies")
    public ResponseEntity<StudyResponse> create(@Valid @RequestBody StudyRequest request) {
        StudyResponse response = studyService.create(request);
        return ResponseEntity.created(URI.create("/api/studies/" + response.slug())).body(response);
    }

    @PutMapping("/api/admin/studies/{id}")
    public StudyResponse update(@PathVariable Long id, @Valid @RequestBody StudyRequest request) {
        return studyService.update(id, request);
    }

    @DeleteMapping("/api/admin/studies/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        studyService.delete(id);
        return ResponseEntity.noContent().build();
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
