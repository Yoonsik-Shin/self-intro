package com.selfintro.modules.printtemplate.application;

import com.selfintro.modules.printtemplate.domain.PrintTemplate;
import com.selfintro.modules.printtemplate.domain.PrintTemplateRepository;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateRequest;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PrintTemplateService {

    private final PrintTemplateRepository printTemplateRepository;

    public List<PrintTemplate> listPublic() {
        return printTemplateRepository.findAllByVisibleTrueOrderByDisplayOrderAsc();
    }

    public List<PrintTemplate> listAll() {
        return printTemplateRepository.findAllByOrderByDisplayOrderAsc();
    }

    @Transactional
    public PrintTemplate create(PrintTemplateRequest request) {
        PrintTemplate template =
                PrintTemplate.create(
                        request.name(),
                        request.excludedIds(),
                        request.sectionOrder(),
                        request.sectionGaps(),
                        request.visible(),
                        request.displayOrder());
        return printTemplateRepository.save(template);
    }

    @Transactional
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
                request.visible(),
                request.displayOrder());
        return printTemplateRepository.save(template);
    }

    @Transactional
    public void delete(Long id) {
        if (!printTemplateRepository.existsById(id)) {
            throw new IllegalArgumentException("PrintTemplate not found: " + id);
        }
        printTemplateRepository.deleteById(id);
    }
}
