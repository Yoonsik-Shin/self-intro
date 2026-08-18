package com.selfintro.modules.portfolio.presentation;

import com.selfintro.modules.identity.application.PublicWorkspaceResolver;
import com.selfintro.modules.portfolio.application.PortfolioCaseStudyService;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyPublicResponse;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyPublicSummaryResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/portfolio/case-studies")
@RequiredArgsConstructor
public class WorkspacePortfolioCaseStudyPublicController {

    private final PortfolioCaseStudyService portfolioCaseStudyService;
    private final PublicWorkspaceResolver publicWorkspaceResolver;

    @GetMapping
    public List<PortfolioCaseStudyPublicSummaryResponse> list(@PathVariable String workspaceSlug) {
        return portfolioCaseStudyService.listPublished(workspaceId(workspaceSlug));
    }

    @GetMapping("/{slug}")
    public PortfolioCaseStudyPublicResponse get(
            @PathVariable String workspaceSlug, @PathVariable String slug) {
        return portfolioCaseStudyService.getPublishedBySlug(workspaceId(workspaceSlug), slug);
    }

    @GetMapping("/by-study/{studyId}")
    public List<PortfolioCaseStudyPublicSummaryResponse> listByStudy(
            @PathVariable String workspaceSlug, @PathVariable Long studyId) {
        return portfolioCaseStudyService.listPublishedByStudyId(
                workspaceId(workspaceSlug), studyId);
    }

    private Long workspaceId(String workspaceSlug) {
        return publicWorkspaceResolver.requireBySlug(workspaceSlug).getId();
    }
}
