package com.selfintro.modules.printtemplate.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.identity.application.PublicWorkspaceResolver;
import com.selfintro.modules.portfolio.domain.entity.PortfolioCaseStudy;
import com.selfintro.modules.portfolio.domain.entity.PortfolioCaseStudyRevision;
import com.selfintro.modules.portfolio.domain.repository.PortfolioCaseStudyRepository;
import com.selfintro.modules.portfolio.domain.repository.PortfolioCaseStudyRevisionRepository;
import com.selfintro.modules.printtemplate.domain.entity.PrintDocumentArtifact;
import com.selfintro.modules.printtemplate.domain.entity.PrintTemplate;
import com.selfintro.modules.printtemplate.domain.entity.PrintTemplateRevision;
import com.selfintro.modules.printtemplate.domain.repository.PrintDocumentArtifactRepository;
import com.selfintro.modules.printtemplate.domain.repository.PrintTemplateRepository;
import com.selfintro.modules.printtemplate.domain.repository.PrintTemplateRevisionRepository;
import com.selfintro.modules.printtemplate.presentation.dto.PrintTemplateRequest;
import com.selfintro.modules.storage.application.StorageService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class PrintTemplateServiceTest {
    @Mock PrintTemplateRepository repository;
    @Mock PrintTemplateRevisionRepository revisionRepository;
    @Mock PrintDocumentArtifactRepository artifactRepository;
    @Mock StorageService storageService;
    @Mock PublicWorkspaceResolver publicWorkspaceResolver;
    @Mock PortfolioCaseStudyRepository portfolioCaseStudyRepository;
    @Mock PortfolioCaseStudyRevisionRepository portfolioCaseStudyRevisionRepository;

    private PrintTemplateService service;

    @BeforeEach
    void setUp() {
        service =
                new PrintTemplateService(
                        repository,
                        revisionRepository,
                        artifactRepository,
                        storageService,
                        publicWorkspaceResolver,
                        portfolioCaseStudyRepository,
                        portfolioCaseStudyRevisionRepository,
                        new ObjectMapper());
        lenient()
                .when(repository.save(any(PrintTemplate.class)))
                .thenAnswer(
                        invocation -> {
                            PrintTemplate template = invocation.getArgument(0);
                            if (template.getId() == null) {
                                ReflectionTestUtils.setField(template, "id", 7L);
                            }
                            return template;
                        });
        lenient()
                .when(revisionRepository.save(any(PrintTemplateRevision.class)))
                .thenAnswer(
                        invocation -> {
                            PrintTemplateRevision revision = invocation.getArgument(0);
                            ReflectionTestUtils.setField(revision, "id", 9L);
                            return revision;
                        });
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
    void createAcceptsOnlyPortfolioRevisionOwnedByWorkspace() {
        PortfolioCaseStudy caseStudy = PortfolioCaseStudy.create(1L, 2L, "checkout", "결제 개선");
        ReflectionTestUtils.setField(caseStudy, "id", 3L);
        PortfolioCaseStudyRevision revision =
                PortfolioCaseStudyRevision.create(3L, 2, "MANUAL", "{}", "");
        ReflectionTestUtils.setField(revision, "id", 10L);
        when(portfolioCaseStudyRepository.findByIdAndWorkspaceId(3L, 1L))
                .thenReturn(Optional.of(caseStudy));
        when(portfolioCaseStudyRevisionRepository.findById(10L)).thenReturn(Optional.of(revision));
        PrintTemplateRequest request =
                new PrintTemplateRequest(
                        "통합 포트폴리오",
                        "[]",
                        "[\"custom-section:portfolio-revision-10\"]",
                        "{}",
                        null,
                        "{\"customSections\":[{\"id\":\"portfolio-revision-10\",\"title\":\"결제 개선\",\"source\":{\"type\":\"PORTFOLIO_CASE_STUDY_REVISION\",\"caseStudyId\":3,\"revisionId\":10,\"revisionVersion\":2},\"items\":[]}]}",
                        null,
                        2,
                        true,
                        0,
                        null,
                        null);

        PrintTemplate saved = service.create(1L, request);

        assertThat(saved.getContentOverrides()).contains("\"revisionId\":10");
    }

    @Test
    void createRejectsPortfolioRevisionFromAnotherWorkspace() {
        PrintTemplateRequest request =
                new PrintTemplateRequest(
                        "통합 포트폴리오",
                        "[]",
                        "[]",
                        "{}",
                        null,
                        "{\"customSections\":[{\"id\":\"portfolio-revision-10\",\"title\":\"결제 개선\",\"source\":{\"type\":\"PORTFOLIO_CASE_STUDY_REVISION\",\"caseStudyId\":3,\"revisionId\":10,\"revisionVersion\":2},\"items\":[]}]}",
                        null,
                        2,
                        true,
                        0,
                        null,
                        null);

        assertThatThrownBy(() -> service.create(1L, request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Workspace에 속한 포트폴리오 revision");
        verify(repository, never()).save(any(PrintTemplate.class));
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
        when(storageService.verifyOwnedPdf(any(), any(), any()))
                .thenReturn(
                        new StorageService.VerifiedPdf(
                                "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
                                123L,
                                "application/pdf"));

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
        ArgumentCaptor<PrintDocumentArtifact> artifactCaptor =
                ArgumentCaptor.forClass(PrintDocumentArtifact.class);
        verify(artifactRepository).save(artifactCaptor.capture());
        PrintDocumentArtifact artifact = artifactCaptor.getValue();
        assertThat(artifact.getWorkspaceId()).isEqualTo(1L);
        assertThat(artifact.getPrintTemplateId()).isEqualTo(7L);
        assertThat(artifact.getPrintTemplateRevisionId()).isEqualTo(9L);
        assertThat(artifact.getOrigin()).isEqualTo(PrintDocumentArtifact.ORIGIN_EXTERNAL_UPLOAD);
        assertThat(artifact.getSha256Checksum()).hasSize(64);
    }

    @Test
    void removeFinalPdfKeepsObjectAlreadyRegisteredAsArtifact() {
        PrintTemplate template =
                PrintTemplate.createExternalPdf(
                        1L,
                        "제출본.pdf",
                        10L,
                        "workspaces/1/print-template/final-pdf/2026/08/submitted.pdf",
                        0);
        ReflectionTestUtils.setField(template, "id", 7L);
        when(repository.findByIdAndWorkspaceId(7L, 1L)).thenReturn(Optional.of(template));
        when(artifactRepository.existsByObjectKey(template.getFinalPdfObjectKey()))
                .thenReturn(true);

        service.removeFinalPdf(1L, 7L);

        assertThat(template.getFinalPdfObjectKey()).isNull();
        verify(storageService, never()).delete(any());
    }

    @Test
    void deleteRejectsTemplateLinkedToImmutableArtifact() {
        PrintTemplate template =
                PrintTemplate.createExternalPdf(
                        1L,
                        "제출본.pdf",
                        10L,
                        "workspaces/1/print-template/final-pdf/2026/08/submitted.pdf",
                        0);
        ReflectionTestUtils.setField(template, "id", 7L);
        when(repository.findByIdAndWorkspaceId(7L, 1L)).thenReturn(Optional.of(template));
        when(artifactRepository.existsByPrintTemplateId(7L)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(1L, 7L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("불변 PDF 아티팩트");

        verify(repository, never()).delete(any());
        verify(storageService, never()).delete(any());
    }

    @Test
    void getArtifactsChecksWorkspaceOwnershipAndUsesScopedQuery() {
        PrintTemplate template =
                PrintTemplate.createExternalPdf(
                        1L,
                        "제출본.pdf",
                        10L,
                        "workspaces/1/print-template/final-pdf/2026/08/submitted.pdf",
                        0);
        ReflectionTestUtils.setField(template, "id", 7L);
        when(repository.findByIdAndWorkspaceId(7L, 1L)).thenReturn(Optional.of(template));
        when(artifactRepository.findByWorkspaceIdAndPrintTemplateIdOrderByIdDesc(1L, 7L))
                .thenReturn(List.of());

        assertThat(service.getArtifacts(1L, 7L)).isEmpty();

        verify(artifactRepository).findByWorkspaceIdAndPrintTemplateIdOrderByIdDesc(1L, 7L);
    }
}
