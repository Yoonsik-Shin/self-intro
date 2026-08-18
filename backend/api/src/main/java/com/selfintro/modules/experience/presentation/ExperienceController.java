package com.selfintro.modules.experience.presentation;

import com.selfintro.bff.application.IntroductionChannel;
import com.selfintro.modules.experience.presentation.dto.ExperienceResponse;
import com.selfintro.modules.identity.application.PublicWorkspaceResolver;
import com.selfintro.modules.identity.publication.application.WorkspacePublishedContentService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/experiences")
@RequiredArgsConstructor
public class ExperienceController {

    private final PublicWorkspaceResolver publicWorkspaceResolver;
    private final WorkspacePublishedContentService publishedContentService;

    @GetMapping
    public ResponseEntity<List<ExperienceResponse>> list() {
        Long workspaceId = publicWorkspaceResolver.requireDefaultPublicWorkspace().getId();
        return ResponseEntity.ok(
                publishedContentService
                        .introduction(workspaceId, IntroductionChannel.WEB)
                        .experiences());
    }
}
