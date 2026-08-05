package com.selfintro.jobposting.presentation;

import com.selfintro.jobposting.application.VectorBatchSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/**
 * Oracle 26ai Native Vector 고품질 배치 동기화 & 하이브리드 검색 트리거 컨트롤러
 */
@RestController
@RequestMapping("/api/v1/vector-sync")
@RequiredArgsConstructor
public class VectorBatchSyncController {

    private final VectorBatchSyncService vectorBatchSyncService;

    public record ExperienceSyncRequest(Long id, String title, String role, String techStack, String description) {}
    public record StudySyncRequest(Long id, String title, String category, String markdownContent) {}
    public record JobPostingSyncRequest(Long id, String title, String companyName, String rawText) {}

    @PostMapping("/experience")
    public ResponseEntity<Map<String, Object>> syncExperience(@RequestBody ExperienceSyncRequest request) {
        int count = vectorBatchSyncService.syncExperienceVector(
                request.id(), request.title(), request.role(), request.techStack(), request.description()
        );
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "experienceId", request.id(), "chunksCreated", count));
    }

    @PostMapping("/study")
    public ResponseEntity<Map<String, Object>> syncStudy(@RequestBody StudySyncRequest request) {
        int count = vectorBatchSyncService.syncStudyVector(
                request.id(), request.title(), request.category(), request.markdownContent()
        );
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "studyId", request.id(), "chunksCreated", count));
    }

    @PostMapping("/job-posting")
    public ResponseEntity<Map<String, Object>> syncJobPosting(@RequestBody JobPostingSyncRequest request) {
        int count = vectorBatchSyncService.syncJobPostingVector(
                request.id(), request.title(), request.companyName(), request.rawText()
        );
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "jobPostingId", request.id(), "chunksCreated", count));
    }
}
