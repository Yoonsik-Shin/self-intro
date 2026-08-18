package com.selfintro.jobposting.presentation;

import com.selfintro.jobposting.application.GapProjectDocumentService;
import com.selfintro.modules.jobposting.presentation.dto.GapProjectDocumentResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/workspaces/{workspaceId}/job-applications/manage")
@RequiredArgsConstructor
public class WorkspaceGapProjectDocumentController {

    private final GapProjectDocumentService gapProjectDocumentService;

    @GetMapping("/{jobPostingId}/gap-project-documents")
    public List<GapProjectDocumentResponse> list(
            @PathVariable Long workspaceId, @PathVariable Long jobPostingId) {
        return gapProjectDocumentService.list(workspaceId, jobPostingId);
    }

    @PostMapping("/{jobPostingId}/gap-project-documents")
    public GapProjectDocumentResponse generate(
            @PathVariable Long workspaceId,
            @PathVariable Long jobPostingId,
            @RequestParam(required = false) String aiModel,
            @RequestParam(required = false) String customModelName) {
        return gapProjectDocumentService.generate(
                workspaceId, jobPostingId, aiModel, customModelName);
    }
}
