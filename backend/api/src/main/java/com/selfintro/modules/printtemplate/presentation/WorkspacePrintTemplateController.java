package com.selfintro.modules.printtemplate.presentation;

import com.selfintro.bff.presentation.dto.IntroductionResponse;
import com.selfintro.modules.identity.application.WorkspaceAccessPolicy;
import com.selfintro.modules.identity.domain.WorkspaceRole;
import com.selfintro.modules.jobposting.domain.repository.WorkspaceJobApplicationRepository;
import com.selfintro.modules.printtemplate.application.PrintTemplateService;
import com.selfintro.modules.printtemplate.application.WorkspaceOutputSourceService;
import com.selfintro.modules.printtemplate.domain.entity.PrintTemplate;
import com.selfintro.modules.printtemplate.presentation.dto.DirectPdfUploadRequest;
import com.selfintro.modules.printtemplate.presentation.dto.PortfolioPrintTemplateRequest;
import com.selfintro.modules.printtemplate.presentation.dto.PrintDocumentArtifactResponse;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateFinalPdfRequest;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateRequest;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateResponse;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateRevisionResponse;
import com.selfintro.modules.storage.application.StorageService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/print-templates/manage")
@RequiredArgsConstructor
public class WorkspacePrintTemplateController {

    private final PrintTemplateService printTemplateService;
    private final StorageService storageService;
    private final WorkspaceAccessPolicy workspaceAccessPolicy;
    private final WorkspaceJobApplicationRepository workspaceJobApplicationRepository;
    private final WorkspaceOutputSourceService workspaceOutputSourceService;

    @GetMapping("/source")
    public IntroductionResponse source(
            Authentication authentication, @PathVariable String workspaceSlug) {
        return workspaceOutputSourceService.get(readWorkspaceId(authentication, workspaceSlug));
    }

    @GetMapping
    public List<PrintTemplateResponse> list(
            Authentication authentication, @PathVariable String workspaceSlug) {
        return printTemplateService.listAll(readWorkspaceId(authentication, workspaceSlug)).stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping
    public PrintTemplateResponse create(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @Valid @RequestBody PrintTemplateRequest request) {
        requireUnlinkedTemplate(request);
        return toResponse(
                printTemplateService.create(
                        writeWorkspaceId(authentication, workspaceSlug), request));
    }

    @PutMapping("/{id}")
    public PrintTemplateResponse update(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id,
            @Valid @RequestBody PrintTemplateRequest request) {
        requireUnlinkedTemplate(request);
        return toResponse(
                printTemplateService.update(
                        writeWorkspaceId(authentication, workspaceSlug), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id) {
        printTemplateService.delete(writeWorkspaceId(authentication, workspaceSlug), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/portfolio/{caseStudyId}")
    public List<PrintTemplateResponse> listPortfolio(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long caseStudyId) {
        return printTemplateService
                .listByPortfolioCaseStudy(
                        readWorkspaceId(authentication, workspaceSlug), caseStudyId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/portfolio/{caseStudyId}/default")
    public PrintTemplateResponse getPortfolioDefault(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long caseStudyId,
            @RequestParam String orientation) {
        return printTemplateService
                .getDefaultForPortfolio(
                        readWorkspaceId(authentication, workspaceSlug), caseStudyId, orientation)
                .map(this::toResponse)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "저장된 배치가 없습니다."));
    }

    @PostMapping("/portfolio/{caseStudyId}")
    public PrintTemplateResponse createPortfolio(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long caseStudyId,
            @Valid @RequestBody PortfolioPrintTemplateRequest request) {
        return toResponse(
                printTemplateService.createPortfolio(
                        writeWorkspaceId(authentication, workspaceSlug), caseStudyId, request));
    }

    @PutMapping("/portfolio/{caseStudyId}/{id}")
    public PrintTemplateResponse updatePortfolio(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long caseStudyId,
            @PathVariable Long id,
            @Valid @RequestBody PortfolioPrintTemplateRequest request) {
        Long workspaceId = writeWorkspaceId(authentication, workspaceSlug);
        var template = printTemplateService.getOrThrow(workspaceId, id);
        if (!caseStudyId.equals(template.getPortfolioCaseStudyId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "리소스를 찾을 수 없습니다.");
        }
        return toResponse(printTemplateService.updatePortfolio(workspaceId, id, request));
    }

    @GetMapping("/{id}/revisions")
    public List<PrintTemplateRevisionResponse> revisions(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id) {
        return printTemplateService.getRevisions(
                readWorkspaceId(authentication, workspaceSlug), id);
    }

    @GetMapping("/{id}/artifacts")
    public List<PrintDocumentArtifactResponse> artifacts(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id) {
        Long workspaceId = readWorkspaceId(authentication, workspaceSlug);
        PrintTemplate template = printTemplateService.getOrThrow(workspaceId, id);
        return printTemplateService.getArtifacts(workspaceId, id).stream()
                .map(
                        artifact ->
                                PrintDocumentArtifactResponse.from(
                                        artifact,
                                        storageService::toPublicUrl,
                                        template.getFinalPdfObjectKey()))
                .toList();
    }

    @PostMapping("/{id}/revisions/{revisionId}/rollback")
    public PrintTemplateResponse rollback(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long id,
            @PathVariable Long revisionId) {
        return toResponse(
                printTemplateService.rollbackConfiguration(
                        writeWorkspaceId(authentication, workspaceSlug), id, revisionId));
    }

    @GetMapping("/job-applications/{jobPostingId}")
    public List<PrintTemplateResponse> listJobApplicationTemplates(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId) {
        Long workspaceId = readWorkspaceId(authentication, workspaceSlug);
        requireJobApplication(workspaceId, jobPostingId);
        return printTemplateService.listByJobPosting(workspaceId, jobPostingId).stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping("/job-applications/{jobPostingId}/direct-pdf")
    public PrintTemplateResponse createDirectPdf(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId,
            @Valid @RequestBody DirectPdfUploadRequest request) {
        Long workspaceId = writeWorkspaceId(authentication, workspaceSlug);
        requireJobApplication(workspaceId, jobPostingId);
        return toResponse(
                printTemplateService.createDirectPdf(
                        workspaceId, jobPostingId, request.name(), request.objectKey()));
    }

    @PatchMapping("/job-applications/{jobPostingId}/{id}/mark-final")
    public PrintTemplateResponse markFinal(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId,
            @PathVariable Long id) {
        Long workspaceId = writeWorkspaceId(authentication, workspaceSlug);
        requireJobApplicationTemplate(workspaceId, jobPostingId, id);
        return toResponse(printTemplateService.markFinalSubmission(workspaceId, id));
    }

    @PatchMapping("/job-applications/{jobPostingId}/{id}/unmark-final")
    public PrintTemplateResponse unmarkFinal(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId,
            @PathVariable Long id) {
        Long workspaceId = writeWorkspaceId(authentication, workspaceSlug);
        requireJobApplicationTemplate(workspaceId, jobPostingId, id);
        return toResponse(printTemplateService.unmarkFinalSubmission(workspaceId, id));
    }

    @PutMapping("/job-applications/{jobPostingId}/{id}/final-pdf")
    public PrintTemplateResponse attachFinalPdf(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId,
            @PathVariable Long id,
            @Valid @RequestBody PrintTemplateFinalPdfRequest request) {
        Long workspaceId = writeWorkspaceId(authentication, workspaceSlug);
        requireJobApplicationTemplate(workspaceId, jobPostingId, id);
        return toResponse(
                printTemplateService.attachFinalPdf(workspaceId, id, request.objectKey()));
    }

    @DeleteMapping("/job-applications/{jobPostingId}/{id}/final-pdf")
    public PrintTemplateResponse removeFinalPdf(
            Authentication authentication,
            @PathVariable String workspaceSlug,
            @PathVariable Long jobPostingId,
            @PathVariable Long id) {
        Long workspaceId = writeWorkspaceId(authentication, workspaceSlug);
        requireJobApplicationTemplate(workspaceId, jobPostingId, id);
        return toResponse(printTemplateService.removeFinalPdf(workspaceId, id));
    }

    private void requireUnlinkedTemplate(PrintTemplateRequest request) {
        if (request.jobPostingId() != null) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "채용공고 연결은 Workspace 지원공고 모델 분리 후 제공됩니다.");
        }
    }

    private void requireJobApplication(Long workspaceId, Long jobPostingId) {
        if (!workspaceJobApplicationRepository.existsByWorkspaceIdAndJobPostingId(
                workspaceId, jobPostingId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "지원 건을 찾을 수 없습니다.");
        }
    }

    private PrintTemplate requireJobApplicationTemplate(
            Long workspaceId, Long jobPostingId, Long templateId) {
        requireJobApplication(workspaceId, jobPostingId);
        PrintTemplate template = printTemplateService.getOrThrow(workspaceId, templateId);
        if (!jobPostingId.equals(template.getJobPostingId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "출력 서식을 찾을 수 없습니다.");
        }
        return template;
    }

    private PrintTemplateResponse toResponse(
            com.selfintro.modules.printtemplate.domain.entity.PrintTemplate entity) {
        return PrintTemplateResponse.from(entity, storageService::toPublicUrl);
    }

    private Long readWorkspaceId(Authentication authentication, String workspaceSlug) {
        return workspaceAccessPolicy
                .requireAnyRole(
                        authentication,
                        workspaceSlug,
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR,
                        WorkspaceRole.VIEWER)
                .getWorkspace()
                .getId();
    }

    private Long writeWorkspaceId(Authentication authentication, String workspaceSlug) {
        return workspaceAccessPolicy
                .requireAnyRole(
                        authentication,
                        workspaceSlug,
                        WorkspaceRole.OWNER,
                        WorkspaceRole.ADMIN,
                        WorkspaceRole.EDITOR)
                .getWorkspace()
                .getId();
    }
}
