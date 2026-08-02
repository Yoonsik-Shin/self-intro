package com.selfintro.modules.printtemplate.application;

import com.selfintro.modules.printtemplate.domain.entity.PrintTemplate;
import com.selfintro.modules.printtemplate.domain.repository.PrintTemplateRepository;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateRequest;
import com.selfintro.modules.storage.application.StorageService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PrintTemplateService {

    private final PrintTemplateRepository printTemplateRepository;
    private final StorageService storageService;

    @Cacheable(value = "print_template:public")
    public List<PrintTemplate> listPublic() {
        return printTemplateRepository.findAllByVisibleTrueOrderByDisplayOrderAsc();
    }

    public List<PrintTemplate> listAll() {
        return printTemplateRepository.findAllByOrderByDisplayOrderAsc();
    }

    public List<PrintTemplate> listByJobPosting(Long jobPostingId) {
        return printTemplateRepository.findAllByJobPostingIdOrderByDisplayOrderAsc(jobPostingId);
    }

    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate create(PrintTemplateRequest request) {
        PrintTemplate template =
                PrintTemplate.create(
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
                        request.jobPostingId());
        return printTemplateRepository.save(template);
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
        long version = printTemplateRepository.countByJobPostingId(jobPostingId) + 1;
        String name = companyName + " " + positionTitle + " AI 초안 v" + version;
        PrintTemplate template =
                PrintTemplate.createAiDraft(
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

    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate update(Long id, PrintTemplateRequest request) {
        PrintTemplate template =
                printTemplateRepository
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        new IllegalArgumentException(
                                                "PrintTemplate not found: " + id));
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
                request.jobPostingId());
        return printTemplateRepository.save(template);
    }

    /** 같은 지원 공고에 연동된 다른 템플릿의 "최종 제출" 표시는 해제하고, 이 템플릿만 표시한다. */
    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate markFinalSubmission(Long id) {
        PrintTemplate template = getOrThrow(id);
        promoteToFinal(template);
        return template;
    }

    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate unmarkFinalSubmission(Long id) {
        PrintTemplate template = getOrThrow(id);
        template.markFinalSubmission(false);
        return template;
    }

    /**
     * 실제로 제출한 PDF 파일을 첨부한다 — 첨부하는 것 자체가 이 템플릿을 최종 제출본으로 확정하는 행위이므로, 같은 공고의 다른 "최종 제출" 표시도 함께 정리한다.
     */
    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public PrintTemplate attachFinalPdf(Long id, String objectKey) {
        PrintTemplate template = getOrThrow(id);
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
    public PrintTemplate removeFinalPdf(Long id) {
        PrintTemplate template = getOrThrow(id);
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
        PrintTemplate template = printTemplateRepository.findById(id).orElse(null);
        if (template == null) {
            throw new IllegalArgumentException("PrintTemplate not found: " + id);
        }
        if (template.getFinalPdfObjectKey() != null) {
            storageService.delete(template.getFinalPdfObjectKey());
        }
        printTemplateRepository.deleteById(id);
    }

    private PrintTemplate getOrThrow(Long id) {
        return printTemplateRepository
                .findById(id)
                .orElseThrow(() -> new IllegalArgumentException("PrintTemplate not found: " + id));
    }

    private void promoteToFinal(PrintTemplate template) {
        if (template.getJobPostingId() == null) {
            throw new IllegalArgumentException(
                    "지원 공고와 연동되지 않은 템플릿은 최종 제출본으로 지정할 수 없습니다: " + template.getId());
        }
        printTemplateRepository
                .findAllByJobPostingIdAndFinalSubmissionTrue(template.getJobPostingId())
                .forEach(other -> other.markFinalSubmission(false));
        template.markFinalSubmission(true);
    }

    private String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
