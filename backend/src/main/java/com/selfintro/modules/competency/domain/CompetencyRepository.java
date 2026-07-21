package com.selfintro.modules.competency.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompetencyRepository extends JpaRepository<Competency, Long> {
    List<Competency> findAllByOrderByDisplayOrderAsc();

    List<Competency> findAllByVisibleTrueOrderByDisplayOrderAsc();
}
