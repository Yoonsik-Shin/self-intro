package com.selfintro.modules.systemstatus.presentation;

import com.selfintro.modules.systemstatus.application.ExternalStatusService;
import com.selfintro.modules.systemstatus.presentation.dto.ExternalServiceStatusResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/system-status")
@RequiredArgsConstructor
public class AdminExternalStatusController {

    private final ExternalStatusService externalStatusService;

    @GetMapping("/external")
    public ResponseEntity<List<ExternalServiceStatusResponse>> external() {
        return ResponseEntity.ok(externalStatusService.checkAll());
    }
}
