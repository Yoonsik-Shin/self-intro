package com.selfintro.modules.portfolio.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.experience.domain.repository.ExperienceDetailRepository;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.portfolio.domain.entity.PortfolioCaseStudy;
import com.selfintro.modules.portfolio.domain.entity.PortfolioCaseStudyRevision;
import com.selfintro.modules.portfolio.domain.repository.PortfolioCaseStudyRepository;
import com.selfintro.modules.portfolio.domain.repository.PortfolioCaseStudyRevisionRepository;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyContent;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyCreateRequest;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyResponse;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyRevisionResponse;
import com.selfintro.modules.storage.application.StorageService;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class PortfolioCaseStudyServiceTest {

    private PortfolioCaseStudyRepository caseStudyRepository;
    private PortfolioCaseStudyRevisionRepository revisionRepository;
    private ExperienceRepository experienceRepository;
    private PortfolioCaseStudyService service;

    @BeforeEach
    void setUp() {
        caseStudyRepository = mock(PortfolioCaseStudyRepository.class);
        revisionRepository = mock(PortfolioCaseStudyRevisionRepository.class);
        experienceRepository = mock(ExperienceRepository.class);
        service =
                new PortfolioCaseStudyService(
                        caseStudyRepository,
                        revisionRepository,
                        experienceRepository,
                        mock(ExperienceDetailRepository.class),
                        mock(StudyRepository.class),
                        mock(PortfolioCaseStudyMarkdownRenderer.class),
                        mock(StorageService.class),
                        new ObjectMapper());
    }

    @Test
    void createsStandaloneCaseWithoutExperience() {
        when(caseStudyRepository.existsByWorkspaceIdAndSlug(7L, "independent-case"))
                .thenReturn(false);
        when(caseStudyRepository.save(any(PortfolioCaseStudy.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        PortfolioCaseStudyResponse created =
                service.create(
                        7L,
                        new PortfolioCaseStudyCreateRequest(
                                null, "independent-case", "원본 없는 독립 사례"));

        assertThat(created.experienceId()).isNull();
        assertThat(created.title()).isEqualTo("원본 없는 독립 사례");
    }

    @Test
    void savesConversationMetadataWithAiRevision() {
        PortfolioCaseStudy caseStudy = PortfolioCaseStudy.create(7L, 10L, "case", "사례");
        PortfolioCaseStudyRevision base = PortfolioCaseStudyRevision.create(30L, 1, "AI", "{}", "");
        when(caseStudyRepository.findByIdAndWorkspaceId(30L, 7L))
                .thenReturn(Optional.of(caseStudy));
        when(revisionRepository.findById(11L)).thenReturn(Optional.of(base));
        when(revisionRepository.countByCaseStudyId(30L)).thenReturn(1L);
        when(revisionRepository.save(any(PortfolioCaseStudyRevision.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        PortfolioCaseStudyRevisionResponse saved =
                service.saveRevision(
                        7L, 30L, emptyContent(), "AI", 11L, " 성과 표현을 줄여줘 ", "NVIDIA NIM");

        assertThat(saved.baseRevisionId()).isEqualTo(11L);
        assertThat(saved.feedbackInstruction()).isEqualTo("성과 표현을 줄여줘");
        assertThat(saved.aiModel()).isEqualTo("NVIDIA NIM");
    }

    @Test
    void rejectsBaseRevisionFromAnotherCaseStudy() {
        PortfolioCaseStudy caseStudy = PortfolioCaseStudy.create(7L, 10L, "case", "사례");
        PortfolioCaseStudyRevision other =
                PortfolioCaseStudyRevision.create(99L, 1, "AI", "{}", "");
        when(caseStudyRepository.findByIdAndWorkspaceId(30L, 7L))
                .thenReturn(Optional.of(caseStudy));
        when(revisionRepository.findById(11L)).thenReturn(Optional.of(other));

        assertThatThrownBy(
                        () ->
                                service.saveRevision(
                                        7L, 30L, emptyContent(), "AI", 11L, "수정해줘", null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("다른 케이스스터디");
    }

    private PortfolioCaseStudyContent emptyContent() {
        return new PortfolioCaseStudyContent(
                "요약",
                "문제",
                "고민",
                List.of(),
                "해결",
                new PortfolioCaseStudyContent.Outcome("성과", List.of()),
                new PortfolioCaseStudyContent.Architecture(null, List.of(), List.of()),
                List.of(),
                List.of());
    }
}
