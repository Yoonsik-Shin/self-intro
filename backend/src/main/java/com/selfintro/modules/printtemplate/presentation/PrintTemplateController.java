package com.selfintro.modules.printtemplate.presentation;

import com.selfintro.modules.printtemplate.application.PrintTemplateService;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateRequest;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class PrintTemplateController {

    private final PrintTemplateService printTemplateService;

    /** 공개 목록 — visible=true만 반환 */
    @GetMapping("/api/print-templates")
    public ResponseEntity<List<PrintTemplateResponse>> listPublic() {
        List<PrintTemplateResponse> list =
                printTemplateService.listPublic().stream()
                        .map(PrintTemplateResponse::from)
                        .toList();
        return ResponseEntity.ok(list);
    }

    /** 관리자 전체 목록 */
    @GetMapping("/api/admin/print-templates")
    public ResponseEntity<List<PrintTemplateResponse>> listAll() {
        List<PrintTemplateResponse> list =
                printTemplateService.listAll().stream().map(PrintTemplateResponse::from).toList();
        return ResponseEntity.ok(list);
    }

    /** 관리자 생성 */
    @PostMapping("/api/admin/print-templates")
    public ResponseEntity<PrintTemplateResponse> create(
            @Valid @RequestBody PrintTemplateRequest request) {
        return ResponseEntity.ok(PrintTemplateResponse.from(printTemplateService.create(request)));
    }

    /** 관리자 수정 */
    @PutMapping("/api/admin/print-templates/{id}")
    public ResponseEntity<PrintTemplateResponse> update(
            @PathVariable Long id, @Valid @RequestBody PrintTemplateRequest request) {
        return ResponseEntity.ok(
                PrintTemplateResponse.from(printTemplateService.update(id, request)));
    }

    /** 관리자 삭제 */
    @DeleteMapping("/api/admin/print-templates/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        printTemplateService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
