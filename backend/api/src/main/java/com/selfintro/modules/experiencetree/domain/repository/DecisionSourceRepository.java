package com.selfintro.modules.experiencetree.domain.repository;

import com.selfintro.modules.experiencetree.domain.entity.DecisionSource;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DecisionSourceRepository extends JpaRepository<DecisionSource, Long> {
    List<DecisionSource> findAllBySituationIdOrderByDisplayOrderAsc(Long situationId);

    void deleteAllBySituationId(Long situationId);
}
