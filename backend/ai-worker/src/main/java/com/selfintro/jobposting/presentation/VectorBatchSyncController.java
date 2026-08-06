package com.selfintro.jobposting.presentation;

import com.selfintro.jobposting.application.VectorBatchSyncService;
import com.selfintro.vectorsearch.application.VectorBackfillOrchestrator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
    private final VectorBackfillOrchestrator vectorBackfillOrchestrator;

    public record ExperienceSyncRequest(Long id, String title, String content) {}
    public record StudySyncRequest(Long id, String title, String markdownContent) {}
    public record JobPostingSyncRequest(Long id, String title, String companyName, String rawText) {}

    @PostMapping("/experience")
    public ResponseEntity<Map<String, Object>> syncExperience(@RequestBody ExperienceSyncRequest request) {
        int count = vectorBatchSyncService.syncExperienceVector(
                request.id(), request.title(), request.content()
        );
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "experienceId", request.id(), "chunksCreated", count));
    }

    @PostMapping("/study")
    public ResponseEntity<Map<String, Object>> syncStudy(@RequestBody StudySyncRequest request) {
        int count = vectorBatchSyncService.syncStudyVector(
                request.id(), request.title(), request.markdownContent()
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

    /**
     * 기존 Experience/Study 전체를 백필한다. 항목이 수백 건이라 요청/응답 안에서 동기로 끝내면 Cloudflare
     * 엣지 타임아웃(524)에 걸리므로, 실제 작업은 {@link VectorBackfillOrchestrator}에서 비동기로 돌리고
     * 여기서는 즉시 202를 반환한다. 진행 상황/완료 여부는 worker 파드 로그의 "[VectorBackfill]"로 확인.
     */
    @PostMapping("/backfill-all")
    public ResponseEntity<Map<String, Object>> backfillAll() {
        vectorBackfillOrchestrator.backfillAll();
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of(
                "status", "ACCEPTED",
                "message", "백그라운드에서 처리 중입니다. worker 로그의 [VectorBackfill]로 진행 상황을 확인하세요."
        ));
    }
}
