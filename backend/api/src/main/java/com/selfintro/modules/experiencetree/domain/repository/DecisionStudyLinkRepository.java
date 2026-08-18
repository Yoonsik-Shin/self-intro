package com.selfintro.modules.experiencetree.domain.repository;

import com.selfintro.modules.experiencetree.domain.entity.DecisionStudyLink;
import com.selfintro.modules.experiencetree.domain.enums.DecisionStudyRelationType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DecisionStudyLinkRepository extends JpaRepository<DecisionStudyLink, Long> {
    List<DecisionStudyLink> findAllByWorkspaceIdAndSituationIdOrderByDisplayOrderAsc(
            Long workspaceId, Long situationId);

    List<DecisionStudyLink> findAllByWorkspaceIdAndStudyIdOrderByDisplayOrderAsc(
            Long workspaceId, Long studyId);

    List<DecisionStudyLink> findAllByOptionId(Long optionId);

    List<DecisionStudyLink> findAllByWorkspaceIdAndManagedByCatalogTrue(Long workspaceId);

    Optional<DecisionStudyLink> findByWorkspaceIdAndSeedKey(Long workspaceId, String seedKey);

    Optional<DecisionStudyLink> findByIdAndWorkspaceId(Long id, Long workspaceId);

    Optional<DecisionStudyLink>
            findByWorkspaceIdAndSituationIdAndOptionScopeKeyAndStudyIdAndRelationType(
                    Long workspaceId,
                    Long situationId,
                    String optionScopeKey,
                    Long studyId,
                    DecisionStudyRelationType relationType);
}
