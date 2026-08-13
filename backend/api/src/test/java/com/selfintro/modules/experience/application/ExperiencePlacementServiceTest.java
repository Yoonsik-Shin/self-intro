package com.selfintro.modules.experience.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

import com.selfintro.modules.experience.domain.entity.*;
import com.selfintro.modules.experience.domain.enums.*;
import com.selfintro.modules.experience.domain.repository.*;
import com.selfintro.modules.experience.presentation.dto.ExperiencePlacementRequest;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ExperiencePlacementServiceTest {

    @Mock ExperiencePlacementRepository placementRepository;
    @Mock ExperiencePlacementDetailRepository placementDetailRepository;
    @Mock ExperienceRepository experienceRepository;

    private ExperiencePlacementService service;

    @BeforeEach
    void setUp() {
        service =
                new ExperiencePlacementService(
                        placementRepository, placementDetailRepository, experienceRepository);
    }

    @Test
    void replacesCoreProjectPlacementsInRequestedOrder() {
        Experience project = mockExperience(10L, "PROJECT");
        Experience secondProject = mockExperience(20L, "PROJECT");
        when(experienceRepository.findAllById(Set.of(10L, 20L)))
                .thenReturn(List.of(project, secondProject));
        when(placementRepository.saveAll(anyList()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response =
                service.replaceAll(
                        ExperiencePlacementType.CORE_PROJECT,
                        List.of(
                                new ExperiencePlacementRequest(20L, 0, true),
                                new ExperiencePlacementRequest(10L, 1, false)));

        assertThat(response).extracting(item -> item.experienceId()).containsExactly(20L, 10L);
        assertThat(response).extracting(item -> item.enabled()).containsExactly(true, false);
        verify(placementRepository).deleteAllByPlacementType(ExperiencePlacementType.CORE_PROJECT);
        verify(placementRepository, times(2)).flush();
    }

    @Test
    void rejectsDuplicateExperienceRouting() {
        var requests =
                List.of(
                        new ExperiencePlacementRequest(10L, 0, true),
                        new ExperiencePlacementRequest(10L, 1, true));

        assertThatThrownBy(() -> service.replaceAll(ExperiencePlacementType.CORE_PROJECT, requests))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("중복");

        verifyNoInteractions(experienceRepository, placementRepository);
    }

    @Test
    void rejectsCareerAsCoreProject() {
        Experience career = mockExperience(30L, "CAREER");
        when(experienceRepository.findAllById(Set.of(30L))).thenReturn(List.of(career));

        assertThatThrownBy(
                        () ->
                                service.replaceAll(
                                        ExperiencePlacementType.CORE_PROJECT,
                                        List.of(new ExperiencePlacementRequest(30L, 0, true))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("프로젝트만");
    }

    @Test
    void replacesOnlyPlacementsOwnedByTheRequestedWorkspace() {
        Long workspaceId = 22L;
        Experience project = mockExperience(10L, "PROJECT");
        when(experienceRepository.findAllByWorkspaceIdAndIdIn(workspaceId, Set.of(10L)))
                .thenReturn(List.of(project));
        when(placementRepository.saveAll(anyList()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response =
                service.replaceAll(
                        workspaceId,
                        ExperiencePlacementType.CORE_PROJECT,
                        List.of(new ExperiencePlacementRequest(10L, 0, true)));

        assertThat(response).extracting(item -> item.experienceId()).containsExactly(10L);
        verify(placementRepository)
                .deleteAllByExperienceWorkspaceIdAndPlacementType(
                        workspaceId, ExperiencePlacementType.CORE_PROJECT);
        verify(placementRepository, never()).deleteAllByPlacementType(any());
    }

    @Test
    void rejectsAProjectOwnedByAnotherWorkspaceWithoutDeletingExistingPlacements() {
        Long workspaceId = 22L;
        when(experienceRepository.findAllByWorkspaceIdAndIdIn(workspaceId, Set.of(91L)))
                .thenReturn(List.of());

        assertThatThrownBy(
                        () ->
                                service.replaceAll(
                                        workspaceId,
                                        ExperiencePlacementType.CORE_PROJECT,
                                        List.of(new ExperiencePlacementRequest(91L, 0, true))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("존재하지 않는");

        verify(placementRepository, never())
                .deleteAllByExperienceWorkspaceIdAndPlacementType(anyLong(), any());
        verify(placementRepository, never()).saveAll(anyList());
    }

    @Test
    void detailMappingCarriesThePlacementExperienceForCompositeForeignKeys() {
        Experience project = mock(Experience.class);
        when(project.getId()).thenReturn(10L);
        ExperiencePlacement placement =
                ExperiencePlacement.create(project, ExperiencePlacementType.CORE_PROJECT, 0, true);
        ExperienceDetail detail = mock(ExperienceDetail.class);

        ExperiencePlacementDetail mapping = ExperiencePlacementDetail.create(placement, detail, 0);

        assertThat(mapping.getExperienceId()).isEqualTo(10L);
    }

    private Experience mockExperience(Long id, String type) {
        Experience experience = mock(Experience.class);
        when(experience.getId()).thenReturn(id);
        when(experience.getType()).thenReturn(type);
        lenient().when(experience.getDetails()).thenReturn(List.of());
        return experience;
    }
}
