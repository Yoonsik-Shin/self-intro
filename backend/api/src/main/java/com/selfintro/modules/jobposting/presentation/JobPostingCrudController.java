package com.selfintro.modules.jobposting.presentation;

import com.selfintro.modules.auth.application.AppUserPrincipal;
import com.selfintro.modules.jobposting.application.JobPostingCrudService;
import com.selfintro.modules.jobposting.application.JobPostingDedupMigrationService;
import com.selfintro.modules.jobposting.application.JobPostingGeocodingBackfillRunner;
import com.selfintro.modules.jobposting.domain.enums.JobPostingPermissionReviewStatus;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingPermissionReviewEventResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingPermissionReviewRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import com.selfintro.modules.securityaudit.application.SecurityAuditService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * 플랫폼 공통 공고 카탈로그의 공유 권한 심사와 정합성 작업만 제공한다.
 *
 * <p>개별 사용자의 저장·지원 상태·메모·지원 문서는 Workspace 경계인 {@code
 * /api/workspaces/{workspaceSlug}/job-applications/manage/**}에서만 관리한다.
 */
@RestController
@RequestMapping("/api/admin/job-postings")
@RequiredArgsConstructor
public class JobPostingCrudController {

    private final JobPostingCrudService crudService;
    private final JobPostingGeocodingBackfillRunner geocodingBackfillRunner;
    private final JobPostingDedupMigrationService dedupMigrationService;
    private final SecurityAuditService securityAuditService;

    @PostMapping("/dedup-migration")
    public JobPostingDedupMigrationService.MigrationResult runDedupMigration() {
        return dedupMigrationService.runMigration();
    }

    @GetMapping
    public Page<JobPostingResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) JobPostingPermissionReviewStatus reviewStatus,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
                    Pageable pageable) {
        return crudService.list(q, reviewStatus, pageable);
    }

    @GetMapping("/{id}")
    public JobPostingResponse get(@PathVariable Long id) {
        return crudService.get(id);
    }

    @PutMapping("/{id}/permission-review")
    public JobPostingResponse reviewSharingPermission(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody JobPostingPermissionReviewRequest request) {
        AppUserPrincipal principal = requirePrincipal(authentication);
        JobPostingResponse response =
                crudService.reviewSharingPermission(id, principal.userId(), request);
        securityAuditService.recordPlatformTargetAction(
                "JOB_POSTING_PERMISSION_REVIEWED", principal.userId(), "JOB_POSTING", id);
        return response;
    }

    @GetMapping("/{id}/permission-review-events")
    public List<JobPostingPermissionReviewEventResponse> permissionReviewEvents(
            @PathVariable Long id) {
        return crudService.permissionReviewEvents(id);
    }

    /** 위치(location) 텍스트는 있는데 좌표가 비어있는 공고만 골라 지오코딩한다. 즉시 반환하고 서버 쪽에서 비동기로 처리한다. */
    @PostMapping("/backfill-coordinates")
    public ResponseEntity<Void> backfillCoordinates() {
        geocodingBackfillRunner.backfillCoordinates();
        return ResponseEntity.accepted().build();
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<String> handleNotFound(EntityNotFoundException exception) {
        return ResponseEntity.notFound().build();
    }

    private AppUserPrincipal requirePrincipal(Authentication authentication) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof AppUserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return principal;
    }
}
