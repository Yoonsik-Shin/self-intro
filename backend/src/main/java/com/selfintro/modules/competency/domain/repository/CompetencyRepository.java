package com.selfintro.modules.competency.domain.repository;

import com.selfintro.modules.competency.domain.entity.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompetencyRepository extends JpaRepository<Competency, Long> {
    List<Competency> findAllByOrderByDisplayOrderAsc();

    List<Competency> findAllByVisibleTrueOrderByDisplayOrderAsc();
}
