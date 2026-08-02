package com.selfintro.modules.studyplan.domain.repository;

import com.selfintro.modules.studyplan.domain.entity.StudyPlan;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudyPlanRepository extends JpaRepository<StudyPlan, Long> {

    List<StudyPlan> findAllByOrderByCreatedAtDesc();
}
