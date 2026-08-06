package com.selfintro.jobposting.presentation;

import com.selfintro.jobposting.application.GapProjectDocumentService;
import com.selfintro.jobposting.application.JobApplicationUrlParseService;
import com.selfintro.jobposting.application.JobPostingAppealService;
import com.selfintro.jobposting.application.JobPostingBackfillService;
import com.selfintro.jobposting.application.JobPostingBackfillService.JobPostingBackfillResult;
import com.selfintro.jobposting.application.JobPostingCollectorService;
import com.selfintro.jobposting.application.JobPostingCollectorService.JobPostingCollectionResult;
import com.selfintro.jobposting.application.JobPostingPrintDraftService;
import com.selfintro.jobposting.application.JobPostingService;
import com.selfintro.jobposting.presentation.dto.GapProjectDocumentResponse;
import com.selfintro.jobposting.presentation.dto.JobApplicationUrlParseRequest;
import com.selfintro.jobposting.presentation.dto.JobApplicationUrlParseResponse;
import com.selfintro.jobposting.presentation.dto.JobPostingImageIngestRequest;
import com.selfintro.jobposting.presentation.dto.JobPostingPrintDraftResponse;
import com.selfintro.modules.jobposting.presentation.dto.JobPostingResponse;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * job_posting의 URL 파싱·크롤링·AI 매칭·백필 전용 엔드포인트. 순수 CRUD/상태 관리는 api 모듈의
 * {@code JobPostingCrudController}(/api/admin/job-postings)가 맡는다 — 2026-08 job-posting CRUD/AI
 * 분리 작업으로 쪼갠 절반이다.
 *
 * <p>경로를 /api/admin/job-postings와 공유하지 않고 /api/worker로 따로 뺀 이유: ingress가 prefix
 * 하나로 이 컨트롤러 전체를 worker Service로 라우팅할 수 있게 하기 위해서다 — 엔드포인트를 하나씩
 * 나열해 라우팅하면 새 엔드포인트를 추가할 때마다 ingress 규칙도 같이 고쳐야 하고, 깜빡하면 다시
 * api pod에서 우연히 처리되는 사고(2026-08-04)가 재발한다.
 */
@RestController
@RequestMapping("/api/worker/job-postings")
@RequiredArgsConstructor
public class JobPostingController {

    private final JobPostingService jobPostingService;
    private final GapProjectDocumentService gapProjectDocumentService;
    private final JobPostingCollectorService jobPostingCollectorService;
    private final JobPostingAppealService jobPostingAppealService;
    private final JobPostingPrintDraftService jobPostingPrintDraftService;
    private final JobApplicationUrlParseService urlParseService;
    private final JobPostingBackfillService backfillService;

    @PostMapping("/parse-url")
    public JobApplicationUrlParseResponse parseUrl(
            @Valid @RequestBody JobApplicationUrlParseRequest request) {
        return urlParseService.parse(request.url());
    }

    @PostMapping(value = "/parse-url/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter parseUrlStream(@Valid @RequestBody JobApplicationUrlParseRequest request) {
        return urlParseService.parseStream(request.url());
    }

    @PostMapping("/ingest-url")
    public JobPostingResponse ingestUrl(@Valid @RequestBody JobApplicationUrlParseRequest request) {
        return jobPostingService.ingestUrl(request.url());
    }

    @PostMapping(value = "/ingest-url/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter ingestUrlStream(@Valid @RequestBody JobApplicationUrlParseRequest request) {
        return jobPostingService.ingestUrlStream(request.url());
    }

    /** URL 파싱이 불가능한 공고를 JD 스크린샷으로 등록한다(기능 B). */
    @PostMapping(value = "/ingest-images/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter ingestImagesStream(@Valid @RequestBody JobPostingImageIngestRequest request) {
        return jobPostingService.ingestImagesStream(request.images());
    }

    @PostMapping(value = "/ingest-urls/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter ingestUrlsStream(
            @Valid @RequestBody
                    com.selfintro.jobposting.presentation.dto.JobApplicationUrlsParseRequest
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

    @PostMapping("/{id}/analyze-appeal")
    public JobPostingResponse analyzeAppeal(@PathVariable Long id) {
        return jobPostingAppealService.analyzeAppeal(id);
    }

    @PostMapping("/{id}/print-template-draft")
    public JobPostingPrintDraftResponse generatePrintTemplateDraft(@PathVariable Long id) {
        return jobPostingPrintDraftService.generate(id);
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
