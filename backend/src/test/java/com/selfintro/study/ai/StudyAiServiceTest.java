package com.selfintro.study.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.ai.NvidiaNimClient;
import com.selfintro.modules.experience.domain.Experience;
import com.selfintro.modules.experience.domain.ExperienceDetailRepository;
import com.selfintro.modules.experience.domain.ExperienceRepository;
import com.selfintro.modules.skill.domain.Skill;
import com.selfintro.modules.skill.domain.SkillRepository;
import com.selfintro.study.dto.StudySuggestionRequest;
import com.selfintro.study.repository.StudyRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class StudyAiServiceTest {
    @Mock SkillRepository skillRepository;
    @Mock ExperienceRepository experienceRepository;
    @Mock ExperienceDetailRepository experienceDetailRepository;
    @Mock StudyRepository studyRepository;
    @Mock NvidiaNimClient nvidiaNimClient;

    private StudyAiService service;

    @BeforeEach
    void setUp() {
        service =
                new StudyAiService(
                        skillRepository,
                        experienceRepository,
                        experienceDetailRepository,
                        studyRepository,
                        nvidiaNimClient,
                        new ObjectMapper(),
                        true);
    }

    private StudySuggestionRequest emptyRequest() {
        return new StudySuggestionRequest("", "", "", List.of(), List.of(), List.of(), List.of());
    }

    @Test
    void orchestratesFactConsolidationThenWritingAndRemovesHallucinatedIds() {
        Skill skill = mock(Skill.class);
        when(skill.getId()).thenReturn(10L);
        when(skill.getName()).thenReturn("Kafka");
        when(skill.getCategory()).thenReturn("BACKEND");
        when(skillRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(skill));

        Experience experience = mock(Experience.class);
        when(experience.getId()).thenReturn(20L);
        when(experience.getType()).thenReturn("PROJECT");
        when(experience.getTitle()).thenReturn("이벤트 처리 파이프라인");
        when(experienceRepository.findAllByOrderByDisplayOrderAsc())
                .thenReturn(List.of(experience));

        when(experienceDetailRepository.findAll()).thenReturn(List.of());
        when(studyRepository.findAll()).thenReturn(List.of());

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

        var response = service.suggest(emptyRequest());

        assertThat(response.suggestions()).hasSize(1);
        var suggestion = response.suggestions().getFirst();
        assertThat(suggestion.title()).isEqualTo("Kafka 이벤트 파이프라인 정리");
        assertThat(suggestion.tagNames()).containsExactly("Kafka", "이벤트드리븐");
        assertThat(suggestion.contentMarkdown()).contains("배경");
    }

    @Test
    void rejectsWhenDisabled() {
        StudyAiService disabled =
                new StudyAiService(
                        skillRepository,
                        experienceRepository,
                        experienceDetailRepository,
                        studyRepository,
                        nvidiaNimClient,
                        new ObjectMapper(),
                        false);
        assertThatThrownBy(() -> disabled.suggest(emptyRequest()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("비활성화");
    }
}
