package com.selfintro.modules.competency.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.selfintro.modules.competency.domain.entity.Competency;
import com.selfintro.modules.competency.domain.repository.CompetencyRepository;
import com.selfintro.modules.competency.presentation.dto.CompetencyRequest;
import com.selfintro.modules.experience.domain.repository.ExperienceRepository;
import com.selfintro.modules.skill.domain.repository.SkillRepository;
import com.selfintro.modules.skill.domain.repository.WorkspaceSkillRepository;
import com.selfintro.modules.study.domain.entity.Tag;
import com.selfintro.modules.study.domain.repository.StudyRepository;
import com.selfintro.modules.study.domain.repository.TagRepository;
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
    @Mock WorkspaceSkillRepository workspaceSkillRepository;
    @Mock ExperienceRepository experienceRepository;
    @Mock StudyRepository studyRepository;
    @Mock TagRepository tagRepository;

    private CompetencyService service;

    @BeforeEach
    void setUp() {
        service =
                new CompetencyService(
                        competencyRepository,
                        skillRepository,
                        workspaceSkillRepository,
                        experienceRepository,
                        studyRepository,
                        tagRepository);
    }

    @Test
    void createsCompetencyWithoutFrontendMatchingConfiguration() {
        when(competencyRepository.save(any(Competency.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        CompetencyRequest request =
                new CompetencyRequest(
                        "백엔드 아키텍처",
                        "도메인 경계를 설계합니다.",
                        1,
                        true,
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of());

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
                        List.of(),
                        List.of());

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("대표 실무 근거");
    }

    @Test
    void rejectsCatalogSkillMissingFromWorkspaceOverlay() {
        when(workspaceSkillRepository.findAllByWorkspaceIdAndSkill_IdIn(10L, List.of(31L)))
                .thenReturn(List.of());
        CompetencyRequest request =
                new CompetencyRequest(
                        "격리된 역량",
                        "Workspace가 선택한 기술만 연결합니다.",
                        1,
                        true,
                        List.of(31L),
                        List.of(),
                        List.of(),
                        List.of());

        assertThatThrownBy(() -> service.create(10L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("현재 Workspace에 추가되지 않은 기술");
        verifyNoInteractions(competencyRepository);
    }

    @Test
    void createsWorkspaceCompetencyWithWorkspaceOwnedTags() {
        when(competencyRepository.save(any(Competency.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(tagRepository.findByWorkspaceIdAndNameIgnoreCase(10L, "성능 최적화"))
                .thenReturn(java.util.Optional.empty());
        when(tagRepository.save(any(Tag.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CompetencyRequest request =
                new CompetencyRequest(
                        "성능 병목 개선",
                        "측정 가능한 병목을 찾아 제거합니다.",
                        1,
                        false,
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of("성능 최적화"));

        var response = service.create(10L, request);

        assertThat(response.tags()).extracting("name").containsExactly("성능 최적화");
        assertThat(response.skills()).isEmpty();
    }

    @Test
    void batchChangeVisibilityUpdatesAllTargetCompetencies() {
        Competency c1 = Competency.create("역량1", "요약1", 1, false);
        Competency c2 = Competency.create("역량2", "요약2", 2, false);
        when(competencyRepository.findAllById(List.of(10L, 20L))).thenReturn(List.of(c1, c2));

        var result = service.batchChangeVisibility(List.of(10L, 20L), true);

        assertThat(result).hasSize(2);
        assertThat(c1.isVisible()).isTrue();
        assertThat(c2.isVisible()).isTrue();
    }

    @Test
    void toggleVisibilityFlipsVisibilityState() {
        Competency c1 = Competency.create("역량1", "요약1", 1, true);
        when(competencyRepository.findById(10L)).thenReturn(java.util.Optional.of(c1));

        var response = service.toggleVisibility(10L);

        assertThat(c1.isVisible()).isFalse();
        assertThat(response.visible()).isFalse();
    }
}
