package com.selfintro.modules.experience.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExperiencePlacementRepository extends JpaRepository<ExperiencePlacement, Long> {
    List<ExperiencePlacement> findAllByPlacementTypeOrderByDisplayOrderAsc(ExperiencePlacementType placementType);

    List<ExperiencePlacement> findAllByPlacementTypeAndEnabledTrueOrderByDisplayOrderAsc(
        ExperiencePlacementType placementType
    );

    void deleteAllByPlacementType(ExperiencePlacementType placementType);
}
