package com.selfintro.study.controller;

import com.selfintro.study.dto.CreateStudyEntryRequest;
import com.selfintro.study.dto.StudyEntryResponse;
import com.selfintro.study.entity.StudyCategory;
import com.selfintro.study.service.StudyEntryService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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
}
