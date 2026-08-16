package com.selfintro.modules.jobapplication.presentation;

import com.selfintro.global.worker.AiWorkerClient;
import com.selfintro.modules.auth.application.RecentReauthenticationPolicy;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/vector-sync")
@RequiredArgsConstructor
public class VectorSyncProxyController {

    private static final String EXTERNAL_EMBEDDING_CONFIRMATION = "EXTERNAL_NVIDIA";

    private final AiWorkerClient aiWorkerClient;
    private final RecentReauthenticationPolicy reauthenticationPolicy;

    public record JobPostingSyncRequest(
            Long id, String title, String companyName, String rawText) {}

    public record MissingRepairRequest(String confirmation) {}

    @PostMapping("/job-posting")
    public ResponseEntity<Map<String, Object>> syncJobPosting(
            @RequestBody JobPostingSyncRequest request) {
        Map<String, Object> result =
                aiWorkerClient.post("/internal/v1/vector-sync/job-posting", request, Map.class);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/backfill-all")
    public ResponseEntity<Map<String, Object>> backfillAll(HttpSession session) {
        reauthenticationPolicy.requireRecent(session);
        Map<String, Object> result =
                aiWorkerClient.post("/internal/v1/vector-sync/backfill-all", null, Map.class);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(result);
    }

    @PostMapping("/reconcile-orphans")
    public ResponseEntity<Map<String, Object>> reconcileOrphans(HttpSession session) {
        reauthenticationPolicy.requireRecent(session);
        Map<String, Object> result =
                aiWorkerClient.post("/internal/v1/vector-sync/reconcile-orphans", null, Map.class);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/reconcile-missing-external")
    public ResponseEntity<Map<String, Object>> reconcileMissingExternal(
            @RequestBody MissingRepairRequest request, HttpSession session) {
        reauthenticationPolicy.requireRecent(session);
        if (request == null || !EXTERNAL_EMBEDDING_CONFIRMATION.equals(request.confirmation())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "외부 임베딩 전송 확인이 필요합니다.");
        }
        Map<String, Object> result =
                aiWorkerClient.post(
                        "/internal/v1/vector-sync/reconcile-missing-external", request, Map.class);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/reconciliation")
    public ResponseEntity<Map<String, Object>> inspectReconciliation() {
        Map<String, Object> result =
                aiWorkerClient.get("/internal/v1/vector-sync/reconciliation", Map.class);
        return ResponseEntity.ok(result);
    }
}
