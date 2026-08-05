package com.selfintro.studyplan.domain.repository;

import com.selfintro.studyplan.domain.entity.StudyPlan;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudyPlanRepository extends JpaRepository<StudyPlan, Long> {

    List<StudyPlan> findAllByOrderByCreatedAtDesc();
}
