package com.selfintro.modules.experience.domain.repository;

import com.selfintro.modules.experience.domain.entity.*;
import com.selfintro.modules.experience.domain.enums.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExperiencePlacementRepository extends JpaRepository<ExperiencePlacement, Long> {
    List<ExperiencePlacement> findAllByPlacementTypeOrderByDisplayOrderAsc(
            ExperiencePlacementType placementType);

    List<ExperiencePlacement> findAllByPlacementTypeAndEnabledTrueOrderByDisplayOrderAsc(
            ExperiencePlacementType placementType);

    void deleteAllByPlacementType(ExperiencePlacementType placementType);

    List<ExperiencePlacement> findAllByExperienceWorkspaceIdAndPlacementTypeOrderByDisplayOrderAsc(
            Long workspaceId, ExperiencePlacementType placementType);

    List<ExperiencePlacement>
            findAllByExperienceWorkspaceIdAndPlacementTypeAndEnabledTrueOrderByDisplayOrderAsc(
                    Long workspaceId, ExperiencePlacementType placementType);

    void deleteAllByExperienceWorkspaceIdAndPlacementType(
            Long workspaceId, ExperiencePlacementType placementType);
}
