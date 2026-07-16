package com.selfintro.modules.competency.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.ai.NvidiaNimClient;
import com.selfintro.modules.competency.domain.CompetencyRepository;
import com.selfintro.modules.competency.presentation.dto.CompetencySuggestionRequest;
import com.selfintro.modules.experience.domain.Experience;
import com.selfintro.modules.experience.domain.ExperienceRepository;
import com.selfintro.modules.skill.domain.Skill;
import com.selfintro.modules.skill.domain.SkillRepository;
import com.selfintro.study.entity.Study;
import com.selfintro.study.entity.StudyStatus;
import com.selfintro.study.repository.StudyRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CompetencyAiServiceTest {
    @Mock CompetencyRepository competencyRepository;
    @Mock SkillRepository skillRepository;
    @Mock ExperienceRepository experienceRepository;
    @Mock StudyRepository studyRepository;
    @Mock NvidiaNimClient nvidiaNimClient;

    private CompetencyAiService service;

    @BeforeEach
    void setUp() {
        service = new CompetencyAiService(
            competencyRepository,
            skillRepository,
            experienceRepository,
            studyRepository,
            nvidiaNimClient,
            new ObjectMapper(),
            true
        );
    }

    @Test
    void orchestratesEvidenceExtractionThenWritingAndRemovesHallucinatedIds() {
        Skill skill = mock(Skill.class);
        when(skill.getId()).thenReturn(10L);
        when(skill.getName()).thenReturn("Spring Boot");
        when(skill.getCategory()).thenReturn("BACKEND");
        when(skillRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(skill));

        Experience experience = mock(Experience.class);
        when(experience.getId()).thenReturn(20L);
        when(experience.getType()).thenReturn("PROJECT");
        when(experience.getTitle()).thenReturn("포트폴리오 프로젝트");
        when(experience.getSkills()).thenReturn(List.of(skill));
        when(experienceRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(experience));

        Study study = mock(Study.class);
        when(study.getId()).thenReturn(30L);
        when(study.getTitle()).thenReturn("동시성 학습");
        when(study.getStatus()).thenReturn(StudyStatus.PUBLISHED);
        when(study.getSkills()).thenReturn(List.of(skill));
        when(studyRepository.findAll()).thenReturn(List.of(study));
        when(competencyRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of());

        when(nvidiaNimClient.generate(anyString(), anyString())).thenReturn(
            """
                {"evidenceGroups":[{
                  "theme":"안정적인 백엔드 설계",
                  "skillIds":[10,999],
                  "evidences":[
                    {"experienceId":20,"fact":"실제 프로젝트에서 검증된 근거"},
                    {"experienceId":999,"fact":"존재하지 않는 근거"}
                  ],
                  "studyIds":[30,999],
                  "reason":"프로젝트와 학습에서 반복 확인됩니다."
                }]}
                """,
            """
                {"suggestions":[{
                  "title":"안정적인 백엔드 설계",
                  "summary":"검증 가능한 프로젝트 경험을 기반으로 안정적인 구조를 설계합니다.",
                  "skillIds":[10,999],
                  "evidences":[
                    {"experienceId":20,"evidenceSummary":"실제 프로젝트 근거","primary":false},
                    {"experienceId":999,"evidenceSummary":"없는 근거","primary":true}
                  ],
                  "studyIds":[30,999],
                  "reason":"프로젝트와 학습에서 확인됩니다."
                }]}
                """
        );

        var response = service.suggest(new CompetencySuggestionRequest("", "", "", List.of(), List.of(), List.of()));

        assertThat(response.suggestions()).hasSize(1);
        var suggestion = response.suggestions().getFirst();
        assertThat(suggestion.skillIds()).containsExactly(10L);
        assertThat(suggestion.studyIds()).containsExactly(30L);
        assertThat(suggestion.evidences()).hasSize(1);
        assertThat(suggestion.evidences().getFirst().experienceId()).isEqualTo(20L);
        assertThat(suggestion.evidences().getFirst().primary()).isTrue();

        ArgumentCaptor<String> systemPrompt = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> userPrompt = ArgumentCaptor.forClass(String.class);
        verify(nvidiaNimClient, times(2)).generate(systemPrompt.capture(), userPrompt.capture());
        assertThat(systemPrompt.getAllValues().get(0)).contains("검증 담당자");
        assertThat(systemPrompt.getAllValues().get(1)).contains("편집자");
        assertThat(userPrompt.getAllValues().get(1))
            .contains("evidenceGroups", "실제 프로젝트에서 검증된 근거")
            .doesNotContain("포트폴리오 프로젝트");
    }
}
