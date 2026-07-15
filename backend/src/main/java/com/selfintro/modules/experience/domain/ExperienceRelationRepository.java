package com.selfintro.modules.experience.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExperienceRelationRepository extends JpaRepository<ExperienceRelation, Long> {
    List<ExperienceRelation> findBySourceIdOrderByDisplayOrderAsc(Long sourceId);
    List<ExperienceRelation> findBySourceIdOrTargetIdOrderByDisplayOrderAsc(Long sourceId, Long targetId);
    void deleteBySourceId(Long sourceId);
}
