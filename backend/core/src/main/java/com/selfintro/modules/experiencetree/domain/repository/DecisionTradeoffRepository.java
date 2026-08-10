package com.selfintro.modules.experiencetree.domain.repository;

import com.selfintro.modules.experiencetree.domain.entity.DecisionTradeoff;
import com.selfintro.modules.experiencetree.domain.enums.TradeoffCriterion;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DecisionTradeoffRepository extends JpaRepository<DecisionTradeoff, Long> {
    Optional<DecisionTradeoff> findByOptionIdAndCriterion(
            Long optionId, TradeoffCriterion criterion);

    List<DecisionTradeoff> findAllByOptionIdInOrderByDisplayOrderAsc(List<Long> optionIds);

    List<DecisionTradeoff> findAllByOptionId(Long optionId);
}
