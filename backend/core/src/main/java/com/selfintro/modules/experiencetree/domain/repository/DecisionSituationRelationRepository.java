package com.selfintro.modules.experiencetree.domain.repository;

import com.selfintro.modules.experiencetree.domain.entity.DecisionSituationRelation;
import com.selfintro.modules.experiencetree.domain.enums.DecisionSituationRelationType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DecisionSituationRelationRepository
        extends JpaRepository<DecisionSituationRelation, Long> {
    Optional<DecisionSituationRelation> findBySourceIdAndTargetIdAndRelationType(
            Long sourceId, Long targetId, DecisionSituationRelationType relationType);

    List<DecisionSituationRelation> findAllByOrderByDisplayOrderAsc();

    void deleteAllBySourceId(Long sourceId);
}
