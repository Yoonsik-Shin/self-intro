package com.selfintro.portfolio.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
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
import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.skill.domain.repository.SkillRepository;
import com.selfintro.modules.skill.domain.repository.WorkspaceSkillRepository;
import com.selfintro.modules.study.domain.entity.Study;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

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
        return new PortfolioCaseStudyGenerateRequest(
                "", List.of(), List.of(), List.of(), null, null);
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
        when(experienceRepository.findById(1L)).thenReturn(Optional.of(experience));

        when(nvidiaNimClient.generate(anyString(), anyString()))
                .thenReturn(
                        """
                {"facts":[
                  {"experienceDetailId":null,"studyId":999,"aspect":"problem","text":"근거 없는 studyId는 버려져야 함"},
                  {"experienceDetailId":null,"studyId":null,"aspect":"problem","text":"알림 지연이 초당 5000건에서 병목이었다"}
                ],"assessment":{"readiness":"READY","coverage":{"problem":{"status":"SATISFIED","reason":"문제 있음"},"role":{"status":"SATISFIED","reason":"역할 있음"},"judgment":{"status":"SATISFIED","reason":"판단 있음"},"solution":{"status":"SATISFIED","reason":"해결 있음"},"outcome":{"status":"SATISFIED","reason":"성과 있음"}},"conflicts":[],"suggestions":[],"questions":[],"message":"생성 가능"}}
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
    void generatesStandaloneCaseFromUserInstructionWithoutExperience() {
        PortfolioCaseStudy caseStudy = mock(PortfolioCaseStudy.class);
        when(caseStudy.getExperienceId()).thenReturn(null);
        when(portfolioCaseStudyRepository.findById(2L)).thenReturn(Optional.of(caseStudy));

        when(nvidiaNimClient.generate(anyString(), anyString()))
                .thenReturn(
                        """
                        {"facts":[{"experienceDetailId":null,"studyId":null,"aspect":"solution","text":"개인 도구의 반복 작업을 자동화했다"}],"assessment":{"readiness":"READY","coverage":{"problem":{"status":"SATISFIED","reason":"문제 있음"},"role":{"status":"SATISFIED","reason":"역할 있음"},"judgment":{"status":"SATISFIED","reason":"판단 있음"},"solution":{"status":"SATISFIED","reason":"해결 있음"},"outcome":{"status":"SATISFIED","reason":"성과 있음"}},"conflicts":[],"suggestions":[],"questions":[],"message":"생성 가능"}}
                        """,
                        """
                        {"summary":"반복 작업을 자동화한 개인 도구입니다.",
                         "problem":"반복 작업에 시간이 들었습니다.",
                         "thoughtProcess":"자동화 범위를 정리했습니다.",
                         "tradeoffs":[],
                         "solution":"개인 도구로 반복 작업을 자동화했습니다.",
                         "outcome":{"summary":"반복 작업을 줄였습니다.","metrics":[]},
                         "architecture":{"mermaidSource":null,"imageObjectKeys":[]},
                         "sourceStudyIds":[],
                         "sourceExperienceDetailIds":[]}
                        """);

        PortfolioCaseStudyContent content =
                service.generate(
                        2L,
                        new PortfolioCaseStudyGenerateRequest(
                                "개인 도구로 반복 작업을 자동화했다",
                                List.of(),
                                List.of(),
                                List.of(),
                                null,
                                null));

        assertThat(content.summary()).contains("개인 도구");
        assertThat(content.sourceExperienceDetailIds()).isEmpty();
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
        when(experienceRepository.findById(1L)).thenReturn(Optional.of(experience));

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
                        {"facts":[{"experienceDetailId":null,"studyId":null,"aspect":"solution","text":"Revision으로 변경 이력을 관리했다"}],"assessment":{"readiness":"READY","coverage":{"problem":{"status":"SATISFIED","reason":"문제 있음"},"role":{"status":"SATISFIED","reason":"역할 있음"},"judgment":{"status":"SATISFIED","reason":"판단 있음"},"solution":{"status":"SATISFIED","reason":"해결 있음"},"outcome":{"status":"SATISFIED","reason":"성과 있음"}},"conflicts":[],"suggestions":[],"questions":[],"message":"생성 가능"}}
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
                                "Revision 설계를 강조해줘", List.of(), List.of(), List.of(), 20L, null));

        assertThat(content.summary()).isEqualTo("개선된 요약");
        assertThat(content.architecture().imageObjectKeys())
                .containsExactly("workspace/1/original.png");
    }

    @Test
    void blocksDraftWritingWhenAdditionalExplanationIsRequired() {
        mockStandaloneCase(3L);
        when(nvidiaNimClient.generate(anyString(), anyString()))
                .thenReturn(
                        """
                        {"facts":[{"experienceDetailId":null,"studyId":null,"aspect":"problem","text":"문제는 확인됨"}],
                         "assessment":{"readiness":"NEEDS_INPUT","coverage":{"problem":{"status":"SATISFIED","reason":"문제 있음"},"role":{"status":"PARTIAL","reason":"역할 불명확"},"judgment":{"status":"MISSING","reason":"판단 없음"},"solution":{"status":"SATISFIED","reason":"해결 있음"},"outcome":{"status":"MISSING","reason":"성과 없음"}},"conflicts":[],"suggestions":["판단과 결과를 설명해 주세요."],"questions":["어떤 대안을 검토했나요?","결과는 무엇이었나요?"],"message":"판단 과정과 결과 근거가 부족합니다."}}
                        """);

        assertThatThrownBy(() -> service.generate(3L, emptyRequest()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("판단 과정과 결과 근거가 부족합니다");
        verify(nvidiaNimClient, times(1)).generate(anyString(), anyString());
    }

    @Test
    void blocksDraftWritingWhenEvidenceMustBeReselected() {
        mockStandaloneCase(4L);
        when(nvidiaNimClient.generate(anyString(), anyString()))
                .thenReturn(
                        """
                        {"facts":[],"assessment":{"readiness":"RESELECT","coverage":{"problem":{"status":"PARTIAL","reason":"다른 프로젝트 문제"},"role":{"status":"MISSING","reason":"역할 없음"},"judgment":{"status":"MISSING","reason":"판단 없음"},"solution":{"status":"PARTIAL","reason":"맥락 불일치"},"outcome":{"status":"MISSING","reason":"성과 없음"}},"conflicts":["학습 기록과 기술이 서로 다른 프로젝트 맥락입니다."],"suggestions":["같은 프로젝트의 학습 기록으로 교체하세요."],"questions":[],"message":"선택한 근거가 하나의 사례로 연결되지 않습니다."}}
                        """);

        assertThatThrownBy(() -> service.generate(4L, emptyRequest()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("하나의 사례로 연결되지 않습니다");
        verify(nvidiaNimClient, times(1)).generate(anyString(), anyString());
    }

    @Test
    void rejectsEvidenceNotLinkedToSelectedProjectBeforeCallingModel() {
        PortfolioCaseStudy caseStudy = mock(PortfolioCaseStudy.class);
        when(caseStudy.getExperienceId()).thenReturn(1L);
        when(portfolioCaseStudyRepository.findById(5L)).thenReturn(Optional.of(caseStudy));

        Experience experience = mock(Experience.class);
        when(experience.getDetails()).thenReturn(List.of());
        when(experience.getSkills()).thenReturn(List.of());
        when(experienceRepository.findById(1L)).thenReturn(Optional.of(experience));

        Study study = mock(Study.class);
        when(study.getId()).thenReturn(11L);
        when(study.getTitle()).thenReturn("0-1 BFS 알고리즘 정리");
        when(study.getExperiences()).thenReturn(List.of());
        when(study.getExperienceDetails()).thenReturn(List.of());
        when(studyRepository.findAllById(List.of(11L))).thenReturn(List.of(study));

        Skill skill = mock(Skill.class);
        when(skill.getId()).thenReturn(12L);
        when(skill.getName()).thenReturn("Azure OpenAI");
        when(skillRepository.findAllById(List.of(12L))).thenReturn(List.of(skill));

        PortfolioCaseStudyGenerateRequest request =
                new PortfolioCaseStudyGenerateRequest(
                        "근거를 진단해줘", List.of(11L), List.of(12L), List.of(), null, null);

        assertThatThrownBy(() -> service.generate(5L, request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("현재 프로젝트와 연결되지 않은 근거");
        verifyNoInteractions(nvidiaNimClient);
    }

    private void mockStandaloneCase(Long caseStudyId) {
        PortfolioCaseStudy caseStudy = mock(PortfolioCaseStudy.class);
        when(caseStudy.getExperienceId()).thenReturn(null);
        when(portfolioCaseStudyRepository.findById(caseStudyId)).thenReturn(Optional.of(caseStudy));
    }
}
