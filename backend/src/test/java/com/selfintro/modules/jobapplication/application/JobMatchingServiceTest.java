package com.selfintro.modules.jobapplication.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.skill.domain.repository.SkillRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JobMatchingServiceTest {

    @Mock private SkillRepository skillRepository;
    @Mock private NvidiaNimClient nvidiaNimClient;

    private Skill skillNamed(String name) {
        return Skill.create(name, "BACKEND", "INTERMEDIATE", false, 0);
    }

    @Test
    void returnsEmptyWhenKeywordOverlapBelowThreshold() {
        when(skillRepository.findAll())
                .thenReturn(List.of(skillNamed("Java"), skillNamed("Spring")));
        JobMatchingService service =
                new JobMatchingService(
                        skillRepository, nvidiaNimClient, new ObjectMapper(), 2, true);

        JobMatchingService.MatchResult result =
                service.evaluate("프론트엔드 개발자", "React, TypeScript 경험 우대");

        assertThat(result.score()).isNull();
        verify(nvidiaNimClient, never()).generate(anyString(), anyString());
    }

    @Test
    void returnsEmptyWhenAiScoringDisabledEvenIfKeywordsMatch() {
        when(skillRepository.findAll())
                .thenReturn(List.of(skillNamed("Java"), skillNamed("Spring")));
        JobMatchingService service =
                new JobMatchingService(
                        skillRepository, nvidiaNimClient, new ObjectMapper(), 1, false);

        JobMatchingService.MatchResult result =
                service.evaluate("백엔드 개발자", "Java, Spring Boot 경험자");

        assertThat(result.score()).isNull();
        verify(nvidiaNimClient, never()).generate(anyString(), anyString());
    }

    @Test
    void callsAiAndClampsScoreWhenThresholdMetAndAiEnabled() {
        when(skillRepository.findAll())
                .thenReturn(List.of(skillNamed("Java"), skillNamed("Spring")));
        when(nvidiaNimClient.generate(anyString(), anyString()))
                .thenReturn("{\"score\":140,\"reason\":\"Java와 Spring 경험이 일치합니다.\"}");
        JobMatchingService service =
                new JobMatchingService(
                        skillRepository, nvidiaNimClient, new ObjectMapper(), 1, true);

        JobMatchingService.MatchResult result =
                service.evaluate("백엔드 개발자", "Java, Spring Boot 경험자");

        assertThat(result.score()).isEqualTo(100);
        assertThat(result.reason()).contains("일치");
    }
}
