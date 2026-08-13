package com.selfintro.modules.printtemplate.presentation;

import com.selfintro.modules.printtemplate.application.PrintTemplateService;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateResponse;
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
                        .map(PrintTemplateResponse::fromPublic)
                        .toList();
        return ResponseEntity.ok(list);
    }
}
