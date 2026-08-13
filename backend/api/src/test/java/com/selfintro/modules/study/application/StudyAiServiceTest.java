package com.selfintro.modules.study.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.modules.experience.domain.entity.Experience;
import com.selfintro.modules.experience.domain.repository.ExperienceDetailRepository;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.skill.domain.repository.SkillRepository;
import com.selfintro.modules.skill.domain.repository.WorkspaceSkillRepository;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import com.selfintro.modules.study.presentation.dto.StudySuggestionRequest;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StudyAiServiceTest {
    @Mock private SkillRepository skillRepository;
    @Mock private WorkspaceSkillRepository workspaceSkillRepository;
    @Mock private ExperienceRepository experienceRepository;
    @Mock private ExperienceDetailRepository experienceDetailRepository;
    @Mock private StudyRepository studyRepository;
    @Mock private NvidiaNimClient nvidiaNimClient;

    private StudyAiService service;

    @BeforeEach
    void setUp() {
        service = newService();
    }

    private StudyAiService newService() {
        return new StudyAiService(
                skillRepository,
                workspaceSkillRepository,
                experienceRepository,
                experienceDetailRepository,
                studyRepository,
                nvidiaNimClient,
                new ObjectMapper());
    }

    private StudySuggestionRequest sampleRequest() {
        return new StudySuggestionRequest(
                "", "", "", List.of(10L), List.of(20L), List.of(), List.of());
    }

    @Test
    void orchestratesFactConsolidationThenWritingAndRemovesHallucinatedIds() {
        Skill skill = mock(Skill.class);
        when(skill.getId()).thenReturn(10L);
        when(skill.getName()).thenReturn("Kafka");
        when(skill.getCategory()).thenReturn("BACKEND");

        Experience experience = mock(Experience.class);
        when(experience.getId()).thenReturn(20L);
        when(experience.getType()).thenReturn("PROJECT");
        when(experience.getTitle()).thenReturn("이벤트 처리 파이프라인");

        lenient().when(skillRepository.findAllById(any())).thenReturn(List.of(skill));
        lenient().when(experienceRepository.findAllById(any())).thenReturn(List.of(experience));
        lenient().when(experienceDetailRepository.findAllById(any())).thenReturn(List.of());
        lenient().when(experienceDetailRepository.findAll()).thenReturn(List.of());
        lenient().when(studyRepository.findAllById(any())).thenReturn(List.of());
        lenient().when(studyRepository.findAll()).thenReturn(List.of());

        when(nvidiaNimClient.generate(anyString(), anyString()))
                .thenReturn(
                        """
                {"facts":[
                  {"skillId":10,"experienceId":20,"experienceDetailId":null,"studyId":null,"text":"Kafka로 이벤트 파이프라인을 구축했다"},
                  {"skillId":999,"experienceId":null,"experienceDetailId":null,"studyId":null,"text":"존재하지 않는 스킬 근거"}
                ],"outline":["배경","구현","회고"],"reason":"프로젝트 근거가 충분함"}
                """,
                        """
                {"suggestions":[{
                  "title":"Kafka 이벤트 파이프라인 정리",
                  "summary":"Kafka 기반 이벤트 처리 파이프라인을 구축한 경험을 정리합니다.",
                  "tagNames":["Kafka","이벤트드리븐"],
                  "contentMarkdown":"## 배경\\n\\n내용",
                  "reason":"검증된 근거 기반 작성"
                }]}
                """);

        var response = service.suggest(sampleRequest());

        assertThat(response.suggestions()).hasSize(1);
        var suggestion = response.suggestions().getFirst();
        assertThat(suggestion.title()).isEqualTo("Kafka 이벤트 파이프라인 정리");
        assertThat(suggestion.tagNames()).containsExactly("Kafka", "이벤트드리븐");
        assertThat(suggestion.contentMarkdown()).contains("배경");
    }

    @Test
    void workspaceGenerationRejectsSkillOutsideWorkspaceBeforeCallingProvider() {
        when(workspaceSkillRepository.findAllByWorkspaceIdAndSkill_IdIn(7L, List.of(10L)))
                .thenReturn(List.of());

        assertThatThrownBy(() -> service.suggest(7L, sampleRequest()))
                .hasMessageContaining("존재하지 않는 기술 항목");
        verifyNoInteractions(nvidiaNimClient);
    }
}
