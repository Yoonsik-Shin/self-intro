package com.selfintro.modules.jobapplication.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfintro.global.ai.NvidiaNimClient;
import com.selfintro.modules.jobapplication.domain.entity.JobPostingSetting;
import com.selfintro.modules.jobapplication.domain.repository.JobPostingSettingRepository;
import com.selfintro.modules.skill.domain.entity.Skill;
import com.selfintro.modules.skill.domain.repository.SkillRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JobMatchingServiceTest {

    @Mock private SkillRepository skillRepository;
    @Mock private JobPostingSettingRepository settingRepository;
    @Mock private NvidiaNimClient nvidiaNimClient;

    private Skill skillNamed(String name) {
        return Skill.create(name, "BACKEND", "INTERMEDIATE", false, 0);
    }

    private JobPostingSetting settingWithThreshold(int threshold) {
        JobPostingSetting setting = JobPostingSetting.defaults(LocalDateTime.now());
        setting.update(
                false,
                null,
                20,
                "pd",
                null,
                null,
                null,
                false,
                threshold,
                "0 0 8 * * *",
                LocalDateTime.now());
        return setting;
    }

    @Test
    void returnsEmptyWhenKeywordOverlapBelowThreshold() {
        when(skillRepository.findAllSkillNames()).thenReturn(List.of("Java", "Spring"));
        when(settingRepository.getOrCreateDefault()).thenReturn(settingWithThreshold(2));
        JobMatchingService service =
                new JobMatchingService(
                        skillRepository, settingRepository, nvidiaNimClient, new ObjectMapper());

        JobMatchingService.MatchResult result =
                service.evaluate("프론트엔드 개발자", "React, TypeScript 경험 우대");

        assertThat(result.score()).isNull();
        verify(nvidiaNimClient, never()).generate(anyString(), anyString());
    }

    @Test
    void evaluatesWithoutSkippingWhenThresholdIsZero() {
        when(skillRepository.findAllSkillNames()).thenReturn(List.of("Java", "Spring"));
        when(settingRepository.getOrCreateDefault()).thenReturn(settingWithThreshold(0));
        when(nvidiaNimClient.generate(anyString(), anyString()))
                .thenReturn("{\"score\":60,\"reason\":\"기본 백엔드 적합도 평가 점수입니다.\"}");
        JobMatchingService service =
                new JobMatchingService(
                        skillRepository, settingRepository, nvidiaNimClient, new ObjectMapper());

        JobMatchingService.MatchResult result =
                service.evaluate("프론트엔드 개발자", "React, TypeScript 경험 우대");

        assertThat(result.score()).isEqualTo(60);
    }

    @Test
    void callsAiAndClampsScoreWhenThresholdMet() {
        when(skillRepository.findAllSkillNames()).thenReturn(List.of("Java", "Spring"));
        when(settingRepository.getOrCreateDefault()).thenReturn(settingWithThreshold(1));
        when(nvidiaNimClient.generate(anyString(), anyString()))
                .thenReturn("{\"score\":140,\"reason\":\"Java와 Spring 경험이 일치합니다.\"}");
        JobMatchingService service =
                new JobMatchingService(
                        skillRepository, settingRepository, nvidiaNimClient, new ObjectMapper());

        JobMatchingService.MatchResult result =
                service.evaluate("백엔드 개발자", "Java, Spring Boot 경험자");

        assertThat(result.score()).isEqualTo(100);
        assertThat(result.reason()).contains("일치");
    }

    @Test
    void returnsEmptyWhenNvidiaClientThrowsBecauseKeyMissing() {
        when(skillRepository.findAllSkillNames()).thenReturn(List.of("Java", "Spring"));
        when(settingRepository.getOrCreateDefault()).thenReturn(settingWithThreshold(1));
        when(nvidiaNimClient.generate(anyString(), anyString()))
                .thenThrow(
                        new org.springframework.web.server.ResponseStatusException(
                                org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "no key"));
        JobMatchingService service =
                new JobMatchingService(
                        skillRepository, settingRepository, nvidiaNimClient, new ObjectMapper());

        JobMatchingService.MatchResult result =
                service.evaluate("백엔드 개발자", "Java, Spring Boot 경험자");

        assertThat(result.score()).isNull();
    }
}
