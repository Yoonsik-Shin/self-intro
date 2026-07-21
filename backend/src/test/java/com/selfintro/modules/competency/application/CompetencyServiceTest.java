package com.selfintro.modules.competency.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.selfintro.modules.competency.domain.Competency;
import com.selfintro.modules.competency.domain.CompetencyRepository;
import com.selfintro.modules.competency.presentation.dto.CompetencyRequest;
import com.selfintro.modules.experience.domain.ExperienceRepository;
import com.selfintro.modules.skill.domain.SkillRepository;
import com.selfintro.study.repository.StudyRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CompetencyServiceTest {
    @Mock CompetencyRepository competencyRepository;
    @Mock SkillRepository skillRepository;
    @Mock ExperienceRepository experienceRepository;
    @Mock StudyRepository studyRepository;

    private CompetencyService service;

    @BeforeEach
    void setUp() {
        service =
                new CompetencyService(
                        competencyRepository,
                        skillRepository,
                        experienceRepository,
                        studyRepository);
    }

    @Test
    void createsCompetencyWithoutFrontendMatchingConfiguration() {
        when(competencyRepository.save(any(Competency.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        CompetencyRequest request =
                new CompetencyRequest(
                        "백엔드 아키텍처", "도메인 경계를 설계합니다.", 1, true, List.of(), List.of(), List.of());

        var response = service.create(request);

        assertThat(response.title()).isEqualTo("백엔드 아키텍처");
        assertThat(response.visible()).isTrue();
        assertThat(response.skills()).isEmpty();
        assertThat(response.evidences()).isEmpty();
    }

    @Test
    void rejectsMoreThanOnePrimaryEvidence() {
        CompetencyRequest request =
                new CompetencyRequest(
                        "분산 시스템",
                        "신뢰성을 확보합니다.",
                        1,
                        true,
                        List.of(),
                        List.of(
                                new CompetencyRequest.EvidenceRequest(1L, "첫 번째", true, 0),
                                new CompetencyRequest.EvidenceRequest(2L, "두 번째", true, 1)),
                        List.of());

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("대표 실무 근거");
    }
}
