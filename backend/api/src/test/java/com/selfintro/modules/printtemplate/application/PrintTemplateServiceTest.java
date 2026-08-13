package com.selfintro.modules.printtemplate.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.identity.application.PublicWorkspaceResolver;
import com.selfintro.modules.portfolio.domain.repository.PortfolioCaseStudyRepository;
import com.selfintro.modules.printtemplate.domain.entity.PrintTemplate;
import com.selfintro.modules.printtemplate.domain.repository.PrintTemplateRepository;
import com.selfintro.modules.printtemplate.domain.repository.PrintTemplateRevisionRepository;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateRequest;
import com.selfintro.modules.storage.application.StorageService;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PrintTemplateServiceTest {
    @Mock PrintTemplateRepository repository;
    @Mock PrintTemplateRevisionRepository revisionRepository;
    @Mock StorageService storageService;
    @Mock PublicWorkspaceResolver publicWorkspaceResolver;
    @Mock PortfolioCaseStudyRepository portfolioCaseStudyRepository;

    private PrintTemplateService service;

    @BeforeEach
    void setUp() {
        service =
                new PrintTemplateService(
                        repository,
                        revisionRepository,
                        storageService,
                        publicWorkspaceResolver,
                        portfolioCaseStudyRepository,
                        new ObjectMapper());
        when(repository.save(any(PrintTemplate.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void oldRequestGetsCompatibleContentDefaults() {
        PrintTemplateRequest request =
                new PrintTemplateRequest(
                        "기본",
                        "[]",
                        "[\"skills\"]",
                        "{}",
                        null,
                        null,
                        null,
                        null,
                        true,
                        1,
                        null,
                        null);

        PrintTemplate saved = service.create(1L, request);

        assertThat(saved.getTargetRole()).isEqualTo("GENERAL");
        assertThat(saved.getContentOverrides()).isEqualTo("{}");
        assertThat(saved.getSchemaVersion()).isEqualTo(2);
    }

    @Test
    void updateKeepsFingerprintWhenLegacyRequestOmitsIt() {
        PrintTemplate existing =
                PrintTemplate.create(
                        1L,
                        "백엔드",
                        "[]",
                        "[\"skills\"]",
                        "{}",
                        "BACKEND",
                        "{\"profile\":{\"bio\":\"백엔드\"}}",
                        "v2-12345678",
                        2,
                        true,
                        1,
                        null,
                        PrintTemplate.DEFAULT_LINE_HEIGHT);
        when(repository.findByIdAndWorkspaceId(1L, 1L)).thenReturn(Optional.of(existing));
        PrintTemplateRequest request =
                new PrintTemplateRequest(
                        "백엔드 수정",
                        "[]",
                        "[\"skills\"]",
                        "{}",
                        null,
                        null,
                        null,
                        null,
                        true,
                        1,
                        null,
                        null);

        PrintTemplate saved = service.update(1L, 1L, request);

        assertThat(saved.getTargetRole()).isEqualTo("BACKEND");
        assertThat(saved.getContentOverrides()).contains("백엔드");
        assertThat(saved.getBaseContentFingerprint()).isEqualTo("v2-12345678");
    }

    @Test
    void createDirectPdfCreatesExternalTemplateAndPromotesToFinal() {
        when(repository.countByWorkspaceIdAndJobPostingId(1L, 10L)).thenReturn(0L);

        PrintTemplate saved =
                service.createDirectPdf(
                        1L,
                        10L,
                        "사람인 이력서.pdf",
                        "workspaces/1/print-template/final-pdf/2026/08/test.pdf");

        assertThat(saved.getName()).isEqualTo("사람인 이력서.pdf");
        assertThat(saved.getSource()).isEqualTo("EXTERNAL");
        assertThat(saved.getJobPostingId()).isEqualTo(10L);
        assertThat(saved.getFinalPdfObjectKey())
                .isEqualTo("workspaces/1/print-template/final-pdf/2026/08/test.pdf");
        assertThat(saved.isFinalSubmission()).isTrue();
    }
}
