package com.selfintro.bff.presentation;

import com.selfintro.bff.application.BffService;
import com.selfintro.bff.application.IntroductionChannel;
import com.selfintro.bff.presentation.dto.IntroductionResponse;
import com.selfintro.modules.identity.application.PublicWorkspaceResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bff")
@RequiredArgsConstructor
public class BffController {

    private final BffService bffService;
    private final PublicWorkspaceResolver publicWorkspaceResolver;

    @GetMapping("/workspaces/{workspaceSlug}/introduction")
    public ResponseEntity<IntroductionResponse> getWorkspaceIntroduction(
            @org.springframework.web.bind.annotation.PathVariable String workspaceSlug,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "WEB")
                    IntroductionChannel channel) {
        Long workspaceId = publicWorkspaceResolver.requireBySlug(workspaceSlug).getId();
        return ResponseEntity.ok(bffService.getIntroduction(workspaceId, channel));
    }
}
