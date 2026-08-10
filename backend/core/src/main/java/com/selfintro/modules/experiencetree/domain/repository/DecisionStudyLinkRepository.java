package com.selfintro.modules.experiencetree.domain.repository;

import com.selfintro.modules.experiencetree.domain.entity.DecisionStudyLink;
import com.selfintro.modules.experiencetree.domain.enums.DecisionStudyRelationType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DecisionStudyLinkRepository extends JpaRepository<DecisionStudyLink, Long> {
    List<DecisionStudyLink> findAllBySituationIdOrderByDisplayOrderAsc(Long situationId);

    List<DecisionStudyLink> findAllByStudyIdOrderByDisplayOrderAsc(Long studyId);

    List<DecisionStudyLink> findAllByOptionId(Long optionId);

    List<DecisionStudyLink> findAllByManagedByCatalogTrue();

    Optional<DecisionStudyLink> findBySeedKey(String seedKey);

    Optional<DecisionStudyLink> findBySituationIdAndOptionScopeKeyAndStudyIdAndRelationType(
            Long situationId,
            String optionScopeKey,
            Long studyId,
            DecisionStudyRelationType relationType);
}
