package com.selfintro.modules.experience.domain.repository;

import com.selfintro.modules.experience.domain.entity.*;
import com.selfintro.modules.experience.domain.enums.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExperienceRelationRepository extends JpaRepository<ExperienceRelation, Long> {
    List<ExperienceRelation> findBySourceIdOrTargetIdOrderByDisplayOrderAsc(
            Long sourceId, Long targetId);
}
