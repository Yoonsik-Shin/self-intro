package com.selfintro.modules.experiencetree.domain.repository;

import com.selfintro.modules.experiencetree.domain.entity.DecisionOption;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DecisionOptionRepository extends JpaRepository<DecisionOption, Long> {
    Optional<DecisionOption> findByStableKey(String stableKey);

    List<DecisionOption> findAllBySituationIdOrderByDisplayOrderAsc(Long situationId);
}
