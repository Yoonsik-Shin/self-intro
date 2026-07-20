package com.selfintro.modules.experience.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.modules.ai.NvidiaNimClient;
import com.selfintro.modules.experience.domain.ExperienceRepository;
import com.selfintro.modules.experience.presentation.dto.ExperienceSuggestionRequest;
import com.selfintro.modules.skill.domain.Skill;
import com.selfintro.modules.skill.domain.SkillRepository;
import com.selfintro.study.repository.StudyRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class ExperienceAiServiceTest {
    @Mock SkillRepository skillRepository;
    @Mock ExperienceRepository experienceRepository;
    @Mock StudyRepository studyRepository;
    @Mock NvidiaNimClient nvidiaNimClient;

    private ExperienceAiService service;

    @BeforeEach
    void setUp() {
        service = new ExperienceAiService(
            skillRepository, experienceRepository, studyRepository, nvidiaNimClient, new ObjectMapper(), true
        );
    }

    private ExperienceSuggestionRequest emptyRequest() {
        return new ExperienceSuggestionRequest(
            "", "PROJECT", "", null, null, null, null, null, List.of(), List.of(), List.of());
    }

    @Test
    void orchestratesFactConsolidationThenWritingAndRemovesHallucinatedSkillIds() {
        Skill skill = mock(Skill.class);
        when(skill.getId()).thenReturn(10L);
        when(skill.getName()).thenReturn("Redis");
        when(skill.getCategory()).thenReturn("BACKEND");
        when(skillRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(skill));
        when(studyRepository.findAll()).thenReturn(List.of());
        when(experienceRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of());

        when(nvidiaNimClient.generate(anyString(), anyString())).thenReturn(
            """
                {"facts":[
                  {"skillId":10,"studyId":null,"experienceId":null,"aspect":"action","text":"Redis 캐시로 응답 속도를 개선했다"}
                ],"reason":"근거 충분"}
                """,
            """
                {"suggestions":[{
                  "summary":"Redis 캐시 도입으로 응답 속도를 개선했습니다.",
                  "takeaway":"캐시 전략 설계 경험을 얻었습니다.",
                  "details":[{"content":"Redis 캐시 적용","situation":"응답 지연","actionDetail":"캐시 도입","outcome":"속도 개선","skillIds":[10,999]}],
                  "reason":"검증된 근거 기반 작성"
                }]}
                """
        );

        var response = service.suggest(emptyRequest());

        assertThat(response.suggestions()).hasSize(1);
        var suggestion = response.suggestions().getFirst();
        assertThat(suggestion.summary()).contains("Redis");
        assertThat(suggestion.details()).hasSize(1);
        assertThat(suggestion.details().getFirst().skillIds()).containsExactly(10L);
    }

    @Test
    void rejectsWhenDisabled() {
        ExperienceAiService disabled = new ExperienceAiService(
            skillRepository, experienceRepository, studyRepository, nvidiaNimClient, new ObjectMapper(), false
        );
        assertThatThrownBy(() -> disabled.suggest(emptyRequest()))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("비활성화");
    }
}
