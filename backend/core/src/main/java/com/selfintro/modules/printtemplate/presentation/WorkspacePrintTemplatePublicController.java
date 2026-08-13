package com.selfintro.modules.printtemplate.presentation;

import com.selfintro.modules.identity.application.PublicWorkspaceResolver;
import com.selfintro.modules.printtemplate.application.PrintTemplateService;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/print-templates")
@RequiredArgsConstructor
public class WorkspacePrintTemplatePublicController {

    private final PrintTemplateService printTemplateService;
    private final PublicWorkspaceResolver publicWorkspaceResolver;

    @GetMapping
    public List<PrintTemplateResponse> list(@PathVariable String workspaceSlug) {
        Long workspaceId = publicWorkspaceResolver.requireBySlug(workspaceSlug).getId();
        return printTemplateService.listPublic(workspaceId).stream()
                .map(PrintTemplateResponse::fromPublic)
                .toList();
    }
}
