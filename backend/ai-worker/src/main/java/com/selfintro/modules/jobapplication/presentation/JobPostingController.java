package com.selfintro.modules.jobapplication.presentation;

import com.selfintro.modules.jobapplication.application.GapProjectDocumentService;
import com.selfintro.modules.jobapplication.application.JobApplicationUrlParseService;
import com.selfintro.modules.jobapplication.application.JobPostingAppealService;
import com.selfintro.modules.jobapplication.application.JobPostingBackfillService;
import com.selfintro.modules.jobapplication.application.JobPostingBackfillService.JobPostingBackfillResult;
import com.selfintro.modules.jobapplication.application.JobPostingCollectorService;
import com.selfintro.modules.jobapplication.application.JobPostingCollectorService.JobPostingCollectionResult;
import com.selfintro.modules.jobapplication.application.JobPostingCoverLetterService;
import com.selfintro.modules.jobapplication.application.JobPostingPrintDraftService;
import com.selfintro.modules.jobapplication.application.JobPostingService;
import com.selfintro.modules.jobapplication.application.JobplanetCompanyService;
import com.selfintro.modules.jobapplication.presentation.dto.GapProjectDocumentResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationUrlParseRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobApplicationUrlParseResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingCoverLetterItemResponse;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingCoverLetterSaveRequest;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingMemoRequest;
import com.selfintro.modules.jobapplication.presentation.dto.JobPostingPrintDraftResponse;
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
import org.springframework.http.MediaType;
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
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/admin/job-postings")
@RequiredArgsConstructor
public class JobPostingController {

    private final JobPostingService jobPostingService;
    private final GapProjectDocumentService gapProjectDocumentService;
    private final JobPostingCoverLetterService coverLetterService;
    private final JobPostingCollectorService jobPostingCollectorService;
    private final JobPostingAppealService jobPostingAppealService;
    private final JobPostingPrintDraftService jobPostingPrintDraftService;
    private final JobplanetCompanyService jobplanetCompanyService;
    private final JobApplicationUrlParseService urlParseService;
    private final JobPostingBackfillService backfillService;

    @GetMapping
    public List<JobPostingResponse> list() {
        return jobPostingService.list();
    }

    @GetMapping("/{id}")
    public JobPostingResponse get(@PathVariable Long id) {
        return jobPostingService.get(id);
    }

    @GetMapping("/{id}/cover-letter-items")
    public List<JobPostingCoverLetterItemResponse> coverLetterItems(@PathVariable Long id) {
        return coverLetterService.list(id);
    }

    @PutMapping("/{id}/cover-letter-items")
    public List<JobPostingCoverLetterItemResponse> replaceCoverLetterItems(
            @PathVariable Long id, @Valid @RequestBody JobPostingCoverLetterSaveRequest request) {
        return coverLetterService.replace(id, request);
    }

    /** "새 지원 공고 등록" — 수집 단계 없이 이미 지원 완료한 공고를 바로 기록한다. */
    @PostMapping
    public JobPostingResponse create(@Valid @RequestBody JobPostingRequest request) {
        return jobPostingService.create(request);
    }

    @PutMapping("/{id}")
    public JobPostingResponse update(
            @PathVariable Long id, @Valid @RequestBody JobPostingRequest request) {
        return jobPostingService.update(id, request);
    }

    @PatchMapping("/{id}/memo")
    public JobPostingResponse updateMemo(
            @PathVariable Long id, @RequestBody JobPostingMemoRequest request) {
        return jobPostingService.updateMemo(id, request != null ? request.memo() : null);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        jobPostingService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/parse-url")
    public JobApplicationUrlParseResponse parseUrl(
            @Valid @RequestBody JobApplicationUrlParseRequest request) {
        return urlParseService.parse(request.url());
    }

    @PostMapping(value = "/parse-url/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter parseUrlStream(@Valid @RequestBody JobApplicationUrlParseRequest request) {
        return urlParseService.parseStream(request.url());
    }

    @GetMapping("/settings")
    public JobPostingSettingResponse getSettings() {
        return jobPostingService.getSettings();
    }

    @PutMapping("/settings")
    public JobPostingSettingResponse updateSettings(
            @Valid @RequestBody JobPostingSettingRequest request) {
        return jobPostingService.updateSettings(request);
    }

    @PostMapping("/ingest-url")
    public JobPostingResponse ingestUrl(@Valid @RequestBody JobApplicationUrlParseRequest request) {
        return jobPostingService.ingestUrl(request.url());
    }

    @PostMapping(value = "/ingest-url/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter ingestUrlStream(@Valid @RequestBody JobApplicationUrlParseRequest request) {
        return jobPostingService.ingestUrlStream(request.url());
    }

    @PostMapping(value = "/ingest-urls/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter ingestUrlsStream(
            @Valid @RequestBody
                    com.selfintro.modules.jobapplication.presentation.dto
                                    .JobApplicationUrlsParseRequest
                            request) {
        return jobPostingService.ingestUrlsStream(request.urls());
    }

    /** 이미 수집/등록된 공고를 원본 URL에서 다시 읽어 최신 정보(마감일 등)로 갱신한다. */
    @PostMapping("/{id}/refresh")
    public JobPostingResponse refresh(@PathVariable Long id) {
        return jobPostingService.refresh(id);
    }

    @PostMapping("/collect")
    public JobPostingCollectionResult collect() {
        return jobPostingCollectorService.collectNow();
    }

    /**
     * 플랫폼 간 중복 병합 기능을 붙이기 전에 이미 따로 수집돼 있던 공고들을 한 번 정리하는 일회성 백필이다. 재실행해도 안전하다(멱등). 결과 요약을 보고
     * 이상이 없으면 정규화 매칭 키에 NOT NULL + UNIQUE 제약을 추가하는 후속 마이그레이션(V155)을 배포한다.
     */
    @PostMapping("/backfill-source-urls")
    public JobPostingBackfillResult backfillSourceUrls() {
        return backfillService.run();
    }

    @PatchMapping("/{id}/save")
    public ResponseEntity<Void> save(@PathVariable Long id) {
        jobPostingService.save(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/unsave")
    public ResponseEntity<Void> unsave(@PathVariable Long id) {
        jobPostingService.unsave(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/dismiss")
    public ResponseEntity<Void> dismiss(@PathVariable Long id) {
        jobPostingService.dismiss(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/undismiss")
    public ResponseEntity<Void> undismiss(@PathVariable Long id) {
        jobPostingService.undismiss(id);
        return ResponseEntity.noContent().build();
    }

    /** 지원 전 후보를 "지원 완료" 상태로 전환한다(예전의 "지원 전환"). */
    @PostMapping("/{id}/apply")
    public JobPostingResponse apply(@PathVariable Long id) {
        return jobPostingService.apply(id);
    }

    /** 실수로 지원 전환했거나 보드에서 잘못 옮긴 경우 지원 전 상태로 되돌린다. */
    @PostMapping("/{id}/unapply")
    public JobPostingResponse unapply(@PathVariable Long id) {
        return jobPostingService.unapply(id);
    }

    @PatchMapping("/{id}/status")
    public JobPostingResponse changeStatus(
            @PathVariable Long id, @Valid @RequestBody JobPostingStatusChangeRequest request) {
        return jobPostingService.changeStatus(id, request.status(), request.memo());
    }

    @GetMapping("/{id}/status-events")
    public List<JobPostingStatusEventResponse> statusEvents(@PathVariable Long id) {
        return jobPostingService.statusEvents(id);
    }

    @DeleteMapping("/{id}/status-events/{eventId}")
    public JobPostingResponse deleteStatusEvent(@PathVariable Long id, @PathVariable Long eventId) {
        return jobPostingService.deleteStatusEvent(id, eventId);
    }

    @PostMapping("/{id}/analyze-appeal")
    public JobPostingResponse analyzeAppeal(@PathVariable Long id) {
        return jobPostingAppealService.analyzeAppeal(id);
    }

    @PostMapping("/{id}/print-template-draft")
    public JobPostingPrintDraftResponse generatePrintTemplateDraft(@PathVariable Long id) {
        return jobPostingPrintDraftService.generate(id);
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

    @GetMapping("/{id}/gap-project-documents")
    public List<GapProjectDocumentResponse> listGapProjectDocuments(@PathVariable Long id) {
        return gapProjectDocumentService.list(id);
    }

    @PostMapping("/{id}/gap-project-documents")
    public GapProjectDocumentResponse generateGapProjectDocument(@PathVariable Long id) {
        return gapProjectDocumentService.generate(id);
    }

    /** 자동 매칭 점수를 현재 보유 기술 스택 기준으로 다시 계산한다. */
    @PostMapping("/{id}/rematch")
    public JobPostingResponse rematch(@PathVariable Long id) {
        return jobPostingService.rematch(id);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<String> handleNotFound(EntityNotFoundException exception) {
        return ResponseEntity.notFound().build();
    }
}
