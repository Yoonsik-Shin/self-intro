package com.selfintro.modules.skill.domain.repository;

import com.selfintro.modules.skill.domain.entity.*;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SkillRepository extends JpaRepository<Skill, Long> {
    Optional<Skill> findByName(String name);

    List<Skill> findAllByOrderByDisplayOrderAsc();

    List<Skill> findAllByIsCoreTrueOrderByDisplayOrderAsc();

    @Query("SELECT s.name FROM Skill s")
    List<String> findAllSkillNames();
}
