package com.selfintro.modules.experiencetree.domain.repository;

import com.selfintro.modules.experiencetree.domain.entity.DecisionSituation;
import com.selfintro.modules.experiencetree.domain.enums.DecisionDomain;
import com.selfintro.modules.experiencetree.domain.enums.VerificationStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DecisionSituationRepository extends JpaRepository<DecisionSituation, Long> {
    Optional<DecisionSituation> findByStableKey(String stableKey);

    List<DecisionSituation> findAllByVerificationStatusOrderByDomainAscDisplayOrderAsc(
            VerificationStatus status);

    List<DecisionSituation> findAllByDomainAndVerificationStatusOrderByDisplayOrderAsc(
            DecisionDomain domain, VerificationStatus status);

    List<DecisionSituation> findAllByOrderByDomainAscDisplayOrderAsc();

    List<DecisionSituation> findAllByDomainOrderByDisplayOrderAsc(DecisionDomain domain);
}
