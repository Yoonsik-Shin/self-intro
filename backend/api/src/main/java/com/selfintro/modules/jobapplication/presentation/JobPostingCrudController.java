package com.selfintro.modules.jobapplication.presentation;

import com.selfintro.modules.jobapplication.application.JobPostingCoverLetterService;
import com.selfintro.modules.jobapplication.application.JobPostingCrudService;
import com.selfintro.modules.jobapplication.application.JobPostingGeocodingBackfillRunner;
import com.selfintro.modules.jobapplication.application.JobplanetCompanyService;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterItemResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterSaveRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingMemoRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingSettingRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingSettingResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingStatusChangeRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingStatusEventResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobplanetCompanyRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobplanetLookupResponse;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * job_posting의 순수 CRUD/상태 관리 엔드포인트. URL 파싱·크롤링·AI 매칭·백필 등은 ai-worker의
 * {@code JobPostingController}가 그대로 맡는다 — 2026-08 job-posting CRUD/AI 분리 작업으로 쪼갠 절반이다.
 */
@RestController
@RequestMapping("/api/admin/job-postings")
@RequiredArgsConstructor
public class JobPostingCrudController {

    private final JobPostingCrudService crudService;
    private final JobplanetCompanyService jobplanetCompanyService;
    private final JobPostingCoverLetterService coverLetterService;
    private final JobPostingGeocodingBackfillRunner geocodingBackfillRunner;

    @GetMapping
    public List<JobPostingResponse> list() {
        return crudService.list();
    }

    @GetMapping("/{id}")
    public JobPostingResponse get(@PathVariable Long id) {
        return crudService.get(id);
    }

    /** "새 지원 공고 등록" — 수집 단계 없이 이미 지원 완료한 공고를 바로 기록한다. */
    @PostMapping
    public JobPostingResponse create(@Valid @RequestBody JobPostingRequest request) {
        return crudService.create(request);
    }

    @PutMapping("/{id}")
    public JobPostingResponse update(
            @PathVariable Long id, @Valid @RequestBody JobPostingRequest request) {
        return crudService.update(id, request);
    }

    @PatchMapping("/{id}/memo")
    public JobPostingResponse updateMemo(
            @PathVariable Long id, @RequestBody JobPostingMemoRequest request) {
        return crudService.updateMemo(id, request != null ? request.memo() : null);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        crudService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /** 위치(location) 텍스트는 있는데 좌표가 비어있는 공고만 골라 지오코딩한다. 즉시 반환하고 서버 쪽에서 비동기로 처리한다. */
    @PostMapping("/backfill-coordinates")
    public ResponseEntity<Void> backfillCoordinates() {
        geocodingBackfillRunner.backfillCoordinates();
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/settings")
    public JobPostingSettingResponse getSettings() {
        return crudService.getSettings();
    }

    @PutMapping("/settings")
    public JobPostingSettingResponse updateSettings(
            @Valid @RequestBody JobPostingSettingRequest request) {
        return crudService.updateSettings(request);
    }

    @PatchMapping("/{id}/save")
    public ResponseEntity<Void> save(@PathVariable Long id) {
        crudService.save(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/unsave")
    public ResponseEntity<Void> unsave(@PathVariable Long id) {
        crudService.unsave(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/dismiss")
    public ResponseEntity<Void> dismiss(@PathVariable Long id) {
        crudService.dismiss(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/undismiss")
    public ResponseEntity<Void> undismiss(@PathVariable Long id) {
        crudService.undismiss(id);
        return ResponseEntity.noContent().build();
    }

    /** 지원 전 후보를 "지원 완료" 상태로 전환한다(예전의 "지원 전환"). */
    @PostMapping("/{id}/apply")
    public JobPostingResponse apply(@PathVariable Long id) {
        return crudService.apply(id);
    }

    /** 실수로 지원 전환했거나 보드에서 잘못 옮긴 경우 지원 전 상태로 되돌린다. */
    @PostMapping("/{id}/unapply")
    public JobPostingResponse unapply(@PathVariable Long id) {
        return crudService.unapply(id);
    }

    @PatchMapping("/{id}/status")
    public JobPostingResponse changeStatus(
            @PathVariable Long id, @Valid @RequestBody JobPostingStatusChangeRequest request) {
        return crudService.changeStatus(id, request.status(), request.memo());
    }

    @GetMapping("/{id}/status-events")
    public List<JobPostingStatusEventResponse> statusEvents(@PathVariable Long id) {
        return crudService.statusEvents(id);
    }

    @DeleteMapping("/{id}/status-events/{eventId}")
    public JobPostingResponse deleteStatusEvent(@PathVariable Long id, @PathVariable Long eventId) {
        return crudService.deleteStatusEvent(id, eventId);
    }

    @GetMapping("/{id}/cover-letter-items")
    public List<JobPostingCoverLetterItemResponse> coverLetterItems(@PathVariable Long id) {
        return coverLetterService.list(id);
    }

    @GetMapping("/cover-letter-items/{itemId}/revisions")
    public List<com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterRevisionResponse> coverLetterRevisions(
            @PathVariable Long itemId) {
        return coverLetterService.getRevisions(itemId);
    }

    @PutMapping("/{id}/cover-letter-items")
    public List<JobPostingCoverLetterItemResponse> replaceCoverLetterItems(
            @PathVariable Long id, @Valid @RequestBody JobPostingCoverLetterSaveRequest request) {
        return coverLetterService.replace(id, request);
    }

    @GetMapping("/{id}/jobplanet")
    public JobplanetLookupResponse getJobplanet(@PathVariable Long id) {
        return jobplanetCompanyService.get(id);
    }

    @PutMapping("/{id}/jobplanet")
    public JobplanetLookupResponse saveJobplanet(
            @PathVariable Long id, @Valid @RequestBody JobplanetCompanyRequest request) {
        return jobplanetCompanyService.save(id, request);
    }

    @DeleteMapping("/{id}/jobplanet")
    public JobplanetLookupResponse clearJobplanet(@PathVariable Long id) {
        return jobplanetCompanyService.clear(id);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<String> handleNotFound(EntityNotFoundException exception) {
        return ResponseEntity.notFound().build();
    }
}
