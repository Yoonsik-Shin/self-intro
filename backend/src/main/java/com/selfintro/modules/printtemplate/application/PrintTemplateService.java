package com.selfintro.modules.printtemplate.application;

import com.selfintro.modules.printtemplate.domain.entity.PrintTemplate;
import com.selfintro.modules.printtemplate.domain.repository.PrintTemplateRepository;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateRequest;
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

    @Cacheable(value = "print_template:public")
    public List<PrintTemplate> listPublic() {
        return printTemplateRepository.findAllByVisibleTrueOrderByDisplayOrderAsc();
    }

    public List<PrintTemplate> listAll() {
        return printTemplateRepository.findAllByOrderByDisplayOrderAsc();
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
                        request.displayOrder());
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
                request.displayOrder());
        return printTemplateRepository.save(template);
    }

    @Transactional
    @CacheEvict(value = "print_template:public", allEntries = true)
    public void delete(Long id) {
        if (!printTemplateRepository.existsById(id)) {
            throw new IllegalArgumentException("PrintTemplate not found: " + id);
        }
        printTemplateRepository.deleteById(id);
    }

    private String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
