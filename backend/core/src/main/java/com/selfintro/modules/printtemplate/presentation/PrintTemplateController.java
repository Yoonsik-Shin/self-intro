package com.selfintro.modules.printtemplate.presentation;

import com.selfintro.modules.printtemplate.application.PrintTemplateService;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateFinalPdfRequest;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateRequest;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateResponse;
import com.selfintro.modules.storage.application.StorageService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    @DeleteMapping("/api/admin/print-templates/{id}/final-pdf")
    public ResponseEntity<PrintTemplateResponse> removeFinalPdf(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(printTemplateService.removeFinalPdf(id)));
    }

    private PrintTemplateResponse toResponse(
            com.selfintro.modules.printtemplate.domain.entity.PrintTemplate entity) {
        return PrintTemplateResponse.from(entity, storageService::toPublicUrl);
    }
}
