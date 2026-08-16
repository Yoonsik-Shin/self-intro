package com.selfintro.modules.experiencetree.domain.repository;

import com.selfintro.modules.experiencetree.domain.entity.DecisionWarning;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DecisionWarningRepository extends JpaRepository<DecisionWarning, Long> {
    Optional<DecisionWarning> findByStableKey(String stableKey);

    List<DecisionWarning> findAllBySituationIdOrderByDisplayOrderAsc(Long situationId);

    void deleteAllBySituationIdAndStableKeyNotIn(Long situationId, List<String> stableKeys);
}
