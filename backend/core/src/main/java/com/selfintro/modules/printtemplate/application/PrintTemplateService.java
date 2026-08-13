package com.selfintro.modules.printtemplate.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.identity.application.PublicWorkspaceResolver;
import com.selfintro.modules.portfolio.domain.repository.PortfolioCaseStudyRepository;
import com.selfintro.modules.printtemplate.domain.entity.PrintTemplate;
import com.selfintro.modules.printtemplate.domain.entity.PrintTemplateRevision;
import com.selfintro.modules.printtemplate.domain.repository.PrintTemplateRepository;
import com.selfintro.modules.printtemplate.domain.repository.PrintTemplateRevisionRepository;
import com.selfintro.modules.printtemplate.presentation.dto.PortfolioPrintTemplateRequest;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateRequest;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateRevisionResponse;
import com.selfintro.modules.storage.application.ImageScope;
import com.selfintro.modules.storage.application.StorageService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PrintTemplateService {

    private final PrintTemplateRepository printTemplateRepository;
    private final PrintTemplateRevisionRepository printTemplateRevisionRepository;
    private final StorageService storageService;
    private final PublicWorkspaceResolver publicWorkspaceResolver;
    private final PortfolioCaseStudyRepository portfolioCaseStudyRepository;
    private final ObjectMapper objectMapper;

    private Long defaultWorkspaceId() {
        return publicWorkspaceResolver.requireDefaultPublicWorkspace().getId();
    }

    @Cacheable(value = "print_template:public")
    public List<PrintTemplate> listPublic() {
        return listPublic(defaultWorkspaceId());
    }

    @Cacheable(value = "print_template:public", key = "#workspaceId")
    public List<PrintTemplate> listPublic(Long workspaceId) {
        return printTemplateRepository
                .findAllByWorkspaceIdAndDocumentTypeAndVisibleTrueOrderByDisplayOrderAsc(
                        workspaceId, PrintTemplate.DOCUMENT_TYPE_RESUME);
    }

    public List<PrintTemplate> listAll() {
        return listAll(defaultWorkspaceId());
    }

    public List<PrintTemplate> listAll(Long workspaceId) {
        return printTemplateRepository.findAllByWorkspaceIdAndDocumentTypeOrderByDisplayOrderAsc(
                workspaceId, PrintTemplate.DOCUMENT_TYPE_RESUME);
    }

    public List<PrintTemplate> listByJobPosting(Long jobPostingId) {
        return listByJobPosting(defaultWorkspaceId(), jobPostingId);
    }

    public List<PrintTemplate> listByJobPosting(Long workspaceId, Long jobPostingId) {
        return printTemplateRepository.findAllByWorkspaceIdAndJobPostingIdOrderByDisplayOrderAsc(
                workspaceId, jobPostingId);
    }

    public List<PrintTemplate> listByPortfolioCaseStudy(Long caseStudyId) {
        return listByPortfolioCaseStudy(defaultWorkspaceId(), caseStudyId);
    }

    public List<PrintTemplate> listByPortfolioCaseStudy(Long workspaceId, Long caseStudyId) {
        return printTemplateRepository
                .findAllByWorkspaceIdAndPortfolioCaseStudyIdOrderByOrientationAscDisplayOrderAsc(
                        workspaceId, caseStudyId);
    }

    public Optional<PrintTemplate> getDefaultForPortfolio(Long caseStudyId, String orientation) {
        return getDefaultForPortfolio(defaultWorkspaceId(), caseStudyId, orientation);
    }

    public Optional<PrintTemplate> getDefaultForPortfolio(
            Long workspaceId, Long caseStudyId, String orientation) {
        return printTemplateRepository
                .findByWorkspaceIdAndPortfolioCaseStudyIdAndOrientationAndVisibleTrue(
                        workspaceId, caseStudyId, orientation);
    }

    @Transactional
    public PrintTemplate createPortfolio(Long caseStudyId, PortfolioPrintTemplateRequest request) {
        return createPortfolio(defaultWorkspaceId(), caseStudyId, request);
    }

    @Transactional
    public PrintTemplate createPortfolio(
            Long workspaceId, Long caseStudyId, PortfolioPrintTemplateRequest request) {
        requirePortfolioCaseStudy(workspaceId, caseStudyId);
        if (request.isDefault()) {
            clearExistingPortfolioDefault(workspaceId, caseStudyId, request.orientation());
        }
        PrintTemplate template =
                PrintTemplate.createPortfolio(
                        workspaceId,
                        request.name(),
                        caseStudyId,
                        request.orientation(),
                        request.excludedIds(),
                        request.sectionOrder(),
                        request.sectionGaps(),
                        request.contentOverrides(),
                        "MANUAL",
                        request.isDefault(),
                        defaultLineHeight(request.lineHeight()),
                        null);
        return printTemplateRepository.save(template);
    }

    @Transactional
    public PrintTemplate updatePortfolio(Long id, PortfolioPrintTemplateRequest request) {
        return updatePortfolio(defaultWorkspaceId(), id, request);
    }

    @Transactional
    public PrintTemplate updatePortfolio(
            Long workspaceId, Long id, PortfolioPrintTemplateRequest request) {
        PrintTemplate template = getOrThrow(workspaceId, id);
        requirePortfolioCaseStudy(workspaceId, template.getPortfolioCaseStudyId());
        if (request.isDefault() && !template.isVisible()) {
            clearExistingPortfolioDefault(
                    workspaceId, template.getPortfolioCaseStudyId(), template.getOrientation());
        }
        template.updatePortfolio(
                request.name(),
                request.excludedIds(),
                request.sectionOrder(),
                request.sectionGaps(),
                request.contentOverrides(),
                request.isDefault(),
                request.lineHeight() == null ? template.getLineHeight() : request.lineHeight());
        return printTemplateRepository.save(template);
    }

    private void clearExistingPortfolioDefault(
            Long workspaceId, Long caseStudyId, String orientation) {
        printTemplateRepository
                .findByWorkspaceIdAndPortfolioCaseStudyIdAndOrientationAndVisibleTrue(
                        workspaceId, caseStudyId, orientation)
                .ifPresent(
                        existing ->
                                existing.updatePortfolio(
                                        existing.getName(),
                                        existing.getExcludedIds(),
                                        existing.getSectionOrder(),
                                        existing.getSectionGaps(),
                                        existing.getContentOverrides(),
                                        false,
                                        existing.getLineHeight()));
    }

    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate create(PrintTemplateRequest request) {
        return create(defaultWorkspaceId(), request);
    }

    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate create(Long workspaceId, PrintTemplateRequest request) {
        PrintTemplate template =
                PrintTemplate.create(
                        workspaceId,
                        request.name(),
                        request.excludedIds(),
                        request.sectionOrder(),
                        request.sectionGaps(),
                        defaultString(request.targetRole(), "GENERAL"),
                        defaultString(request.contentOverrides(), "{}"),
                        request.baseContentFingerprint(),
                        request.schemaVersion() == null ? 2 : request.schemaVersion(),
                        request.visible(),
                        request.displayOrder(),
                        request.jobPostingId(),
                        defaultLineHeight(request.lineHeight()));
        PrintTemplate saved = printTemplateRepository.save(template);
        recordConfigurationSnapshot(saved);
        return saved;
    }

    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate createAiDraft(
            Long jobPostingId,
            String companyName,
            String positionTitle,
            String excludedIds,
            String sectionOrder,
            String sectionGaps,
            String targetRole,
            String contentOverrides,
            String generationMetadata) {
        return createAiDraft(
                defaultWorkspaceId(),
                jobPostingId,
                companyName,
                positionTitle,
                excludedIds,
                sectionOrder,
                sectionGaps,
                targetRole,
                contentOverrides,
                generationMetadata);
    }

    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate createAiDraft(
            Long workspaceId,
            Long jobPostingId,
            String companyName,
            String positionTitle,
            String excludedIds,
            String sectionOrder,
            String sectionGaps,
            String targetRole,
            String contentOverrides,
            String generationMetadata) {
        long version =
                printTemplateRepository.countByWorkspaceIdAndJobPostingId(workspaceId, jobPostingId)
                        + 1;
        String name = companyName + " " + positionTitle + " AI 초안 v" + version;
        PrintTemplate template =
                PrintTemplate.createAiDraft(
                        workspaceId,
                        name,
                        excludedIds,
                        sectionOrder,
                        sectionGaps,
                        defaultString(targetRole, "GENERAL"),
                        defaultString(contentOverrides, "{}"),
                        defaultString(generationMetadata, "{}"),
                        Math.toIntExact(version - 1),
                        jobPostingId);
        return printTemplateRepository.save(template);
    }

    /** 대화형 재생성 — 기존 슬롯(row)의 name/visible/lineHeight 등 사용자 조작 필드는 그대로 두고 AI가 만든 콘텐츠만 갱신한다. */
    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate applyAiRevision(
            Long templateId,
            String excludedIds,
            String sectionOrder,
            String targetRole,
            String contentOverrides,
            String generationMetadata) {
        return applyAiRevision(
                defaultWorkspaceId(),
                templateId,
                excludedIds,
                sectionOrder,
                targetRole,
                contentOverrides,
                generationMetadata);
    }

    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate applyAiRevision(
            Long workspaceId,
            Long templateId,
            String excludedIds,
            String sectionOrder,
            String targetRole,
            String contentOverrides,
            String generationMetadata) {
        PrintTemplate template = getOrThrow(workspaceId, templateId);
        template.updateAiDraftContent(
                excludedIds, sectionOrder, targetRole, contentOverrides, generationMetadata);
        return printTemplateRepository.save(template);
    }

    /**
     * 포트폴리오 AI 초안 — 기존 수동 배치의 기본값을 함부로 덮어쓰지 않도록 항상 isDefault=false로 만든다(마음에 들면 관리자가
     * updatePortfolio로 승격).
     */
    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate createPortfolioAiDraft(
            Long caseStudyId,
            String caseStudyTitle,
            String orientation,
            String excludedIds,
            String sectionOrder,
            String contentOverrides,
            String generationMetadata) {
        return createPortfolioAiDraft(
                defaultWorkspaceId(),
                caseStudyId,
                caseStudyTitle,
                orientation,
                excludedIds,
                sectionOrder,
                contentOverrides,
                generationMetadata);
    }

    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate createPortfolioAiDraft(
            Long workspaceId,
            Long caseStudyId,
            String caseStudyTitle,
            String orientation,
            String excludedIds,
            String sectionOrder,
            String contentOverrides,
            String generationMetadata) {
        long version =
                printTemplateRepository.countByWorkspaceIdAndPortfolioCaseStudyIdAndOrientation(
                                workspaceId, caseStudyId, orientation)
                        + 1;
        String name = caseStudyTitle + " AI 초안 v" + version;
        PrintTemplate template =
                PrintTemplate.createPortfolio(
                        workspaceId,
                        name,
                        caseStudyId,
                        orientation,
                        excludedIds,
                        sectionOrder,
                        "{}",
                        contentOverrides,
                        PrintTemplate.SOURCE_AI,
                        false,
                        PrintTemplate.DEFAULT_LINE_HEIGHT,
                        generationMetadata);
        return printTemplateRepository.save(template);
    }

    public List<PrintTemplateRevisionResponse> getRevisions(Long templateId) {
        return getRevisions(defaultWorkspaceId(), templateId);
    }

    public List<PrintTemplateRevisionResponse> getRevisions(Long workspaceId, Long templateId) {
        getOrThrow(workspaceId, templateId);
        return printTemplateRevisionRepository
                .findByPrintTemplateIdOrderByIdAsc(templateId)
                .stream()
                .map(PrintTemplateRevisionResponse::from)
                .toList();
    }

    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate rollbackConfiguration(Long workspaceId, Long templateId, Long revisionId) {
        PrintTemplate template = getOrThrow(workspaceId, templateId);
        var revision =
                printTemplateRevisionRepository
                        .findByIdAndPrintTemplateId(revisionId, templateId)
                        .filter(
                                item ->
                                        PrintTemplateRevision.SENDER_SNAPSHOT.equals(
                                                item.getSenderType()))
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "복원 가능한 출력 revision을 찾을 수 없습니다."));
        ConfigurationSnapshot snapshot = readSnapshot(revision.getContent());
        template.update(
                snapshot.name(),
                snapshot.excludedIds(),
                snapshot.sectionOrder(),
                snapshot.sectionGaps(),
                snapshot.targetRole(),
                snapshot.contentOverrides(),
                snapshot.baseContentFingerprint(),
                snapshot.schemaVersion(),
                snapshot.visible(),
                snapshot.displayOrder(),
                snapshot.jobPostingId(),
                snapshot.lineHeight());
        PrintTemplate saved = printTemplateRepository.save(template);
        recordConfigurationSnapshot(saved);
        return saved;
    }

    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate createDirectPdf(
            Long workspaceId, Long jobPostingId, String name, String objectKey) {
        storageService.requireOwnedObjectKey(
                workspaceId, ImageScope.PRINT_TEMPLATE_FINAL_PDF, objectKey);
        long version =
                printTemplateRepository.countByWorkspaceIdAndJobPostingId(workspaceId, jobPostingId)
                        + 1;
        String templateName = (name != null && !name.isBlank()) ? name : "외부 제출 PDF v" + version;
        PrintTemplate template =
                PrintTemplate.createExternalPdf(
                        workspaceId,
                        templateName,
                        jobPostingId,
                        objectKey,
                        Math.toIntExact(version - 1));
        PrintTemplate saved = printTemplateRepository.save(template);
        promoteToFinal(saved);
        return saved;
    }

    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate update(Long id, PrintTemplateRequest request) {
        return update(defaultWorkspaceId(), id, request);
    }

    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate update(Long workspaceId, Long id, PrintTemplateRequest request) {
        PrintTemplate template = getOrThrow(workspaceId, id);
        template.update(
                request.name(),
                request.excludedIds(),
                request.sectionOrder(),
                request.sectionGaps(),
                defaultString(request.targetRole(), template.getTargetRole()),
                defaultString(request.contentOverrides(), template.getContentOverrides()),
                request.baseContentFingerprint() == null
                        ? template.getBaseContentFingerprint()
                        : request.baseContentFingerprint(),
                request.schemaVersion() == null
                        ? template.getSchemaVersion()
                        : request.schemaVersion(),
                request.visible(),
                request.displayOrder(),
                request.jobPostingId(),
                request.lineHeight() == null ? template.getLineHeight() : request.lineHeight());
        PrintTemplate saved = printTemplateRepository.save(template);
        recordConfigurationSnapshot(saved);
        return saved;
    }

    private void recordConfigurationSnapshot(PrintTemplate template) {
        if (!PrintTemplate.DOCUMENT_TYPE_RESUME.equals(template.getDocumentType())) return;
        ConfigurationSnapshot snapshot = ConfigurationSnapshot.from(template);
        try {
            printTemplateRevisionRepository.save(
                    PrintTemplateRevision.create(
                            template.getId(),
                            PrintTemplateRevision.SENDER_SNAPSHOT,
                            objectMapper.writeValueAsString(snapshot),
                            LocalDateTime.now()));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("출력 구성을 revision으로 저장하지 못했습니다.", exception);
        }
    }

    private ConfigurationSnapshot readSnapshot(String content) {
        try {
            return objectMapper.readValue(content, ConfigurationSnapshot.class);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY, "출력 revision을 복원할 수 없습니다.", exception);
        }
    }

    private record ConfigurationSnapshot(
            String name,
            String excludedIds,
            String sectionOrder,
            String sectionGaps,
            String targetRole,
            String contentOverrides,
            String baseContentFingerprint,
            int schemaVersion,
            boolean visible,
            int displayOrder,
            Long jobPostingId,
            double lineHeight) {
        private static ConfigurationSnapshot from(PrintTemplate template) {
            return new ConfigurationSnapshot(
                    template.getName(),
                    template.getExcludedIds(),
                    template.getSectionOrder(),
                    template.getSectionGaps(),
                    template.getTargetRole(),
                    template.getContentOverrides(),
                    template.getBaseContentFingerprint(),
                    template.getSchemaVersion(),
                    template.isVisible(),
                    template.getDisplayOrder(),
                    template.getJobPostingId(),
                    template.getLineHeight());
        }
    }

    /** 같은 지원 공고에 연동된 다른 템플릿의 "최종 제출" 표시는 해제하고, 이 템플릿만 표시한다. */
    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate markFinalSubmission(Long workspaceId, Long id) {
        PrintTemplate template = getOrThrow(workspaceId, id);
        promoteToFinal(template);
        return template;
    }

    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate unmarkFinalSubmission(Long workspaceId, Long id) {
        PrintTemplate template = getOrThrow(workspaceId, id);
        template.markFinalSubmission(false);
        return template;
    }

    /**
     * 실제로 제출한 PDF 파일을 첨부한다 — 첨부하는 것 자체가 이 템플릿을 최종 제출본으로 확정하는 행위이므로, 같은 공고의 다른 "최종 제출" 표시도 함께 정리한다.
     */
    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate attachFinalPdf(Long workspaceId, Long id, String objectKey) {
        storageService.requireOwnedObjectKey(
                workspaceId, ImageScope.PRINT_TEMPLATE_FINAL_PDF, objectKey);
        PrintTemplate template = getOrThrow(workspaceId, id);
        String previousObjectKey = template.getFinalPdfObjectKey();
        template.attachFinalPdf(objectKey);
        promoteToFinal(template);
        if (previousObjectKey != null && !previousObjectKey.equals(objectKey)) {
            storageService.delete(previousObjectKey);
        }
        return template;
    }

    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate removeFinalPdf(Long workspaceId, Long id) {
        PrintTemplate template = getOrThrow(workspaceId, id);
        String previousObjectKey = template.getFinalPdfObjectKey();
        template.clearFinalPdf();
        if (previousObjectKey != null) {
            storageService.delete(previousObjectKey);
        }
        return template;
    }

    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public void delete(Long id) {
        delete(defaultWorkspaceId(), id);
    }

    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public void delete(Long workspaceId, Long id) {
        PrintTemplate template = getOrThrow(workspaceId, id);
        if (template.getFinalPdfObjectKey() != null) {
            storageService.delete(template.getFinalPdfObjectKey());
        }
        printTemplateRepository.delete(template);
    }

    public PrintTemplate getOrThrow(Long id) {
        return getOrThrow(defaultWorkspaceId(), id);
    }

    public PrintTemplate getOrThrow(Long workspaceId, Long id) {
        return printTemplateRepository
                .findByIdAndWorkspaceId(id, workspaceId)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND, "PrintTemplate not found: " + id));
    }

    private void promoteToFinal(PrintTemplate template) {
        if (template.getJobPostingId() == null) {
            throw new IllegalArgumentException(
                    "지원 공고와 연동되지 않은 템플릿은 최종 제출본으로 지정할 수 없습니다: " + template.getId());
        }
        printTemplateRepository
                .findAllByWorkspaceIdAndJobPostingIdAndFinalSubmissionTrue(
                        template.getWorkspaceId(), template.getJobPostingId())
                .forEach(other -> other.markFinalSubmission(false));
        template.markFinalSubmission(true);
    }

    private String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private double defaultLineHeight(Double value) {
        return value == null ? PrintTemplate.DEFAULT_LINE_HEIGHT : value;
    }

    private void requirePortfolioCaseStudy(Long workspaceId, Long caseStudyId) {
        if (caseStudyId == null
                || portfolioCaseStudyRepository
                        .findByIdAndWorkspaceId(caseStudyId, workspaceId)
                        .isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "PortfolioCaseStudy not found: " + caseStudyId);
        }
    }
}
