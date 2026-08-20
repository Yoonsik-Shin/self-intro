package com.selfintro.portfolio.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.modules.competency.domain.repository.CompetencyRepository;
import com.selfintro.modules.experience.domain.entity.Experience;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.portfolio.domain.entity.PortfolioCaseStudy;
import com.selfintro.modules.portfolio.domain.entity.PortfolioCaseStudyRevision;
import com.selfintro.modules.portfolio.domain.repository.PortfolioCaseStudyRepository;
import com.selfintro.modules.portfolio.domain.repository.PortfolioCaseStudyRevisionRepository;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyContent;
import com.selfintro.modules.portfolio.presentation.dto.PortfolioCaseStudyGenerateRequest;
import com.selfintro.modules.skill.domain.repository.SkillRepository;
import com.selfintro.modules.skill.domain.repository.WorkspaceSkillRepository;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PortfolioCaseStudyAiServiceTest {
    @Mock PortfolioCaseStudyRepository portfolioCaseStudyRepository;
    @Mock PortfolioCaseStudyRevisionRepository portfolioCaseStudyRevisionRepository;
    @Mock ExperienceRepository experienceRepository;
    @Mock CompetencyRepository competencyRepository;
    @Mock SkillRepository skillRepository;
    @Mock WorkspaceSkillRepository workspaceSkillRepository;
    @Mock StudyRepository studyRepository;
    @Mock NvidiaNimClient nvidiaNimClient;

    private PortfolioCaseStudyAiService service;

    @BeforeEach
    void setUp() {
        service =
                new PortfolioCaseStudyAiService(
                        portfolioCaseStudyRepository,
                        portfolioCaseStudyRevisionRepository,
                        experienceRepository,
                        competencyRepository,
                        skillRepository,
                        workspaceSkillRepository,
                        studyRepository,
                        nvidiaNimClient,
                        new ObjectMapper());
    }

    private PortfolioCaseStudyGenerateRequest emptyRequest() {
        return new PortfolioCaseStudyGenerateRequest("", List.of(), List.of(), List.of(), null);
    }

    @Test
    void dropsFactsWithoutValidSourceIdsAndKeepsOnlyGroundedTradeoffs() {
        PortfolioCaseStudy caseStudy = mock(PortfolioCaseStudy.class);
        when(caseStudy.getExperienceId()).thenReturn(1L);
        when(portfolioCaseStudyRepository.findById(1L)).thenReturn(Optional.of(caseStudy));

        Experience experience = mock(Experience.class);
        when(experience.getTitle()).thenReturn("실시간 알림 시스템");
        when(experience.getSummary()).thenReturn("RabbitMQ 기반 알림 파이프라인 구축");
        when(experience.getTakeaway()).thenReturn("메시지 큐 설계 경험");
        when(experience.getDetails()).thenReturn(List.of());
        when(experience.getSkills()).thenReturn(List.of());
        when(experienceRepository.findById(1L)).thenReturn(Optional.of(experience));
        when(studyRepository.findAllByExperiences_IdOrderByTitleAsc(1L)).thenReturn(List.of());
        when(competencyRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of());

        when(nvidiaNimClient.generate(anyString(), anyString()))
                .thenReturn(
                        """
                {"facts":[
                  {"experienceDetailId":null,"studyId":999,"aspect":"problem","text":"근거 없는 studyId는 버려져야 함"},
                  {"experienceDetailId":null,"studyId":null,"aspect":"problem","text":"알림 지연이 초당 5000건에서 병목이었다"}
                ],"reason":"근거 충분"}
                """,
                        """
                {"summary":"RabbitMQ 도입으로 알림 지연을 개선했습니다.",
                 "problem":"알림 지연이 병목이었습니다.",
                 "thoughtProcess":"큐 도입을 검토했습니다.",
                 "tradeoffs":[],
                 "solution":"RabbitMQ를 도입했습니다.",
                 "outcome":{"summary":"지연이 개선되었습니다.","metrics":[]},
                 "architecture":{"mermaidSource":null,"imageObjectKeys":[]},
                 "sourceStudyIds":[999],
                 "sourceExperienceDetailIds":[]}
                """);

        PortfolioCaseStudyContent content = service.generate(1L, emptyRequest());

        assertThat(content.problem()).contains("병목");
        assertThat(content.sourceStudyIds()).isEmpty();
    }

    @Test
    void revisesSavedDraftAndPreservesExistingImageObjectKeys() throws Exception {
        PortfolioCaseStudy caseStudy = mock(PortfolioCaseStudy.class);
        when(caseStudy.getExperienceId()).thenReturn(1L);
        when(portfolioCaseStudyRepository.findById(1L)).thenReturn(Optional.of(caseStudy));

        Experience experience = mock(Experience.class);
        when(experience.getTitle()).thenReturn("포트폴리오 서비스");
        when(experience.getSummary()).thenReturn("근거 기반 포트폴리오 관리");
        when(experience.getTakeaway()).thenReturn("Revision 설계");
        when(experience.getDetails()).thenReturn(List.of());
        when(experience.getSkills()).thenReturn(List.of());
        when(experienceRepository.findById(1L)).thenReturn(Optional.of(experience));
        when(studyRepository.findAllByExperiences_IdOrderByTitleAsc(1L)).thenReturn(List.of());
        when(competencyRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of());

        String baseJson =
                """
                {"summary":"기존 요약","problem":"기존 문제","thoughtProcess":"기존 고민",\
                "tradeoffs":[],"solution":"기존 해결","outcome":{"summary":"기존 성과","metrics":[]},\
                "architecture":{"mermaidSource":null,"imageObjectKeys":["workspace/1/original.png"],"imageUrls":[]},\
                "sourceStudyIds":[],"sourceExperienceDetailIds":[]}
                """;
        PortfolioCaseStudyRevision baseRevision =
                PortfolioCaseStudyRevision.create(1L, 1, "AI", baseJson, "");
        when(portfolioCaseStudyRevisionRepository.findById(20L))
                .thenReturn(Optional.of(baseRevision));

        when(nvidiaNimClient.generate(anyString(), anyString()))
                .thenReturn(
                        """
                        {"facts":[{"experienceDetailId":null,"studyId":null,"aspect":"solution","text":"Revision으로 변경 이력을 관리했다"}],"reason":"근거 충분"}
                        """,
                        """
                        {"summary":"개선된 요약","problem":"기존 문제","thoughtProcess":"기존 고민",\
                        "tradeoffs":[],"solution":"Revision으로 변경 이력을 관리했습니다.",\
                        "outcome":{"summary":"기존 성과","metrics":[]},\
                        "architecture":{"mermaidSource":null,"imageObjectKeys":["invented.png"]},\
                        "sourceStudyIds":[],"sourceExperienceDetailIds":[]}
                        """);

        PortfolioCaseStudyContent content =
                service.generate(
                        1L,
                        new PortfolioCaseStudyGenerateRequest(
                                "Revision 설계를 강조해줘", List.of(), List.of(), List.of(), 20L));

        assertThat(content.summary()).isEqualTo("개선된 요약");
        assertThat(content.architecture().imageObjectKeys())
                .containsExactly("workspace/1/original.png");
    }
}
