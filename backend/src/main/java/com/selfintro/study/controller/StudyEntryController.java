package com.selfintro.study.controller;

import com.selfintro.study.dto.CreateStudyEntryRequest;
import com.selfintro.study.dto.StudyEntryResponse;
import com.selfintro.study.entity.StudyCategory;
import com.selfintro.study.service.StudyEntryService;
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
@RequestMapping("/api/study-entries")
public class StudyEntryController {

    private final StudyEntryService studyEntryService;

    @GetMapping
    public List<StudyEntryResponse> findAll(@RequestParam(required = false) StudyCategory category) {
        return studyEntryService.findAll(category);
    }

    @PostMapping
    public ResponseEntity<StudyEntryResponse> create(@Valid @RequestBody CreateStudyEntryRequest request) {
        StudyEntryResponse response = studyEntryService.create(request);
        return ResponseEntity
                .created(URI.create("/api/study-entries/" + response.id()))
                .body(response);
    }

    @PutMapping("/{id}")
    public StudyEntryResponse update(@PathVariable Long id, @Valid @RequestBody CreateStudyEntryRequest request) {
        return studyEntryService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        studyEntryService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Void> handleNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }
}
