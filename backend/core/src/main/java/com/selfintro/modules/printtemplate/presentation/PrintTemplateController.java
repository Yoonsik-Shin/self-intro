package com.selfintro.modules.printtemplate.presentation;

import com.selfintro.modules.printtemplate.application.PrintTemplateService;
import com.selfintro.modules.printtemplate.presentation.dto.DirectPdfUploadRequest;
import com.selfintro.modules.printtemplate.presentation.dto.PortfolioPrintTemplateRequest;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateFinalPdfRequest;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateRequest;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateResponse;
import com.selfintro.modules.storage.application.StorageService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
public class PrintTemplateController {

    private final PrintTemplateService printTemplateService;
    private final StorageService storageService;

    /** 공개 목록 — visible=true만 반환 */
    @GetMapping("/api/print-templates")
    public ResponseEntity<List<PrintTemplateResponse>> listPublic() {
        List<PrintTemplateResponse> list =
                printTemplateService.listPublic().stream().map(this::toResponse).toList();
        return ResponseEntity.ok(list);
    }

    /** 관리자 전체 목록. jobPostingId를 주면 해당 공고에 연동된 템플릿만 반환한다. */
    @GetMapping("/api/admin/print-templates")
    public ResponseEntity<List<PrintTemplateResponse>> listAll(
            @RequestParam(required = false) Long jobPostingId) {
        List<PrintTemplateResponse> list =
                (jobPostingId != null
                                ? printTemplateService.listByJobPosting(jobPostingId)
                                : printTemplateService.listAll())
                        .stream().map(this::toResponse).toList();
        return ResponseEntity.ok(list);
    }

    /** 관리자 생성 */
    @PostMapping("/api/admin/print-templates")
    public ResponseEntity<PrintTemplateResponse> create(
            @Valid @RequestBody PrintTemplateRequest request) {
        return ResponseEntity.ok(toResponse(printTemplateService.create(request)));
    }

    /** 관리자 수정 */
    @PutMapping("/api/admin/print-templates/{id}")
    public ResponseEntity<PrintTemplateResponse> update(
            @PathVariable Long id, @Valid @RequestBody PrintTemplateRequest request) {
        return ResponseEntity.ok(toResponse(printTemplateService.update(id, request)));
    }

    /** 관리자 삭제 */
    @DeleteMapping("/api/admin/print-templates/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        printTemplateService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /** 포트폴리오 케이스스터디 배치 목록(방향별로 여러 개) */
    @GetMapping("/api/admin/print-templates/portfolio/{caseStudyId}")
    public ResponseEntity<List<PrintTemplateResponse>> listPortfolio(
            @PathVariable Long caseStudyId) {
        List<PrintTemplateResponse> list =
                printTemplateService.listByPortfolioCaseStudy(caseStudyId).stream()
                        .map(this::toResponse)
                        .toList();
        return ResponseEntity.ok(list);
    }

    /** 방향별 기본 배치 — 없으면 404(프론트가 자동 배치로 대체) */
    @GetMapping("/api/admin/print-templates/portfolio/{caseStudyId}/default")
    public ResponseEntity<PrintTemplateResponse> getPortfolioDefault(
            @PathVariable Long caseStudyId, @RequestParam String orientation) {
        return printTemplateService
                .getDefaultForPortfolio(caseStudyId, orientation)
                .map(this::toResponse)
                .map(ResponseEntity::ok)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND, "저장된 배치가 없습니다."));
    }

    @PostMapping("/api/admin/print-templates/portfolio/{caseStudyId}")
    public ResponseEntity<PrintTemplateResponse> createPortfolio(
            @PathVariable Long caseStudyId,
            @Valid @RequestBody PortfolioPrintTemplateRequest request) {
        return ResponseEntity.ok(
                toResponse(printTemplateService.createPortfolio(caseStudyId, request)));
    }

    @PutMapping("/api/admin/print-templates/portfolio/{caseStudyId}/{id}")
    public ResponseEntity<PrintTemplateResponse> updatePortfolio(
            @PathVariable Long caseStudyId,
            @PathVariable Long id,
            @Valid @RequestBody PortfolioPrintTemplateRequest request) {
        return ResponseEntity.ok(toResponse(printTemplateService.updatePortfolio(id, request)));
    }

    /** 연동된 지원 공고 기준으로 이 템플릿을 "최종 제출본"으로 지정한다(같은 공고의 다른 표시는 해제). */
    @PatchMapping("/api/admin/print-templates/{id}/mark-final")
    public ResponseEntity<PrintTemplateResponse> markFinal(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(printTemplateService.markFinalSubmission(id)));
    }

    @PatchMapping("/api/admin/print-templates/{id}/unmark-final")
    public ResponseEntity<PrintTemplateResponse> unmarkFinal(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(printTemplateService.unmarkFinalSubmission(id)));
    }

    /**
     * 실제로 제출한 PDF 파일(사전에 presigned-upload로 올려둔 objectKey)을 이 템플릿에 첨부한다. 첨부하는 순간 이 템플릿이 최종 제출본으로
     * 지정된다.
     */
    @PutMapping("/api/admin/print-templates/{id}/final-pdf")
    public ResponseEntity<PrintTemplateResponse> attachFinalPdf(
            @PathVariable Long id, @Valid @RequestBody PrintTemplateFinalPdfRequest request) {
        return ResponseEntity.ok(
                toResponse(printTemplateService.attachFinalPdf(id, request.objectKey())));
    }

    @PostMapping("/api/admin/job-postings/{jobPostingId}/direct-pdf")
    public ResponseEntity<PrintTemplateResponse> createDirectPdf(
            @PathVariable Long jobPostingId,
            @Valid @RequestBody DirectPdfUploadRequest request) {
        return ResponseEntity.ok(
                toResponse(
                        printTemplateService.createDirectPdf(
                                jobPostingId, request.name(), request.objectKey())));
    }

    @DeleteMapping("/api/admin/print-templates/{id}/final-pdf")
    public ResponseEntity<PrintTemplateResponse> removeFinalPdf(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(printTemplateService.removeFinalPdf(id)));
    }

    private PrintTemplateResponse toResponse(
            com.selfintro.modules.printtemplate.domain.entity.PrintTemplate entity) {
        return PrintTemplateResponse.from(entity, storageService::toPublicUrl);
    }
}
