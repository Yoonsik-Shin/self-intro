package com.selfintro.jobposting.presentation;

import com.selfintro.jobposting.application.VectorBatchSyncService;
import com.selfintro.vectorsearch.application.VectorBackfillOrchestrator;
import com.selfintro.vectorsearch.application.VectorSourceReconciliationService;
import com.selfintro.vectorsearch.application.VectorSourceReconciliationService.MissingRepairResult;
import com.selfintro.vectorsearch.application.VectorSourceReconciliationService.ReconciliationInspection;
import com.selfintro.vectorsearch.application.VectorSourceReconciliationService.ReconciliationResult;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Oracle 26ai Native Vector 고품질 배치 동기화 & 하이브리드 검색 내부 컨트롤러 */
@RestController
@RequestMapping("/internal/v1/vector-sync")
@RequiredArgsConstructor
public class VectorBatchSyncController {

    private static final String EXTERNAL_EMBEDDING_CONFIRMATION = "EXTERNAL_NVIDIA";

    private final VectorBatchSyncService vectorBatchSyncService;
    private final VectorBackfillOrchestrator vectorBackfillOrchestrator;
    private final VectorSourceReconciliationService vectorSourceReconciliationService;

    public record JobPostingSyncRequest(
            Long id, String title, String companyName, String rawText) {}

    public record MissingRepairRequest(String confirmation) {}

    @PostMapping("/job-posting")
    public ResponseEntity<Map<String, Object>> syncJobPosting(
            @RequestBody JobPostingSyncRequest request) {
        int count =
                vectorBatchSyncService.syncJobPostingVector(
                        request.id(), request.title(), request.companyName(), request.rawText());
        return ResponseEntity.ok(
                Map.of("status", "SUCCESS", "jobPostingId", request.id(), "chunksCreated", count));
    }

    @PostMapping("/backfill-all")
    public ResponseEntity<Map<String, Object>> backfillAll() {
        vectorBackfillOrchestrator.backfillAll();
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(
                        Map.of(
                                "status", "ACCEPTED",
                                "message",
                                        "고아 vector 재조정과 전체 백필을 처리 중입니다. worker 로그의 [VectorReconciliation], [VectorBackfill]을 확인하세요."));
    }

    /** 외부 임베딩 호출 없이 MySQL 원본이 없는 Experience/Study vector namespace만 삭제한다. */
    @PostMapping("/reconcile-orphans")
    public ResponseEntity<ReconciliationResult> reconcileOrphans() {
        return ResponseEntity.ok(vectorSourceReconciliationService.removeOrphans());
    }

    /** 명시적 외부 전송 확인 후 누락 namespace만 NVIDIA embedding provider로 생성한다. */
    @PostMapping("/reconcile-missing-external")
    public ResponseEntity<MissingRepairResult> reconcileMissingExternal(
            @RequestBody MissingRepairRequest request) {
        if (request == null || !EXTERNAL_EMBEDDING_CONFIRMATION.equals(request.confirmation())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "외부 임베딩 전송 확인이 필요합니다.");
        }
        return ResponseEntity.ok(
                vectorSourceReconciliationService.repairMissingWithExternalProvider());
    }

    /** 삭제 없이 Oracle vector namespace와 MySQL source of truth의 차이 건수만 확인한다. */
    @GetMapping("/reconciliation")
    public ResponseEntity<ReconciliationInspection> inspectReconciliation() {
        return ResponseEntity.ok(vectorSourceReconciliationService.inspectOrphans());
    }
}
