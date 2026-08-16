package com.selfintro.modules.identity.presentation;

import com.selfintro.modules.identity.application.PlatformOperationsOverviewService;
import com.selfintro.modules.identity.application.PlatformOperationsOverviewService.PlatformOperationsOverview;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ops/overview")
public class PlatformOperationsOverviewController {

    private final PlatformOperationsOverviewService overviewService;

    @GetMapping
    public PlatformOperationsOverview get() {
        return overviewService.load();
    }
}
