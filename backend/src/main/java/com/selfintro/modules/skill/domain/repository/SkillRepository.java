package com.selfintro.modules.skill.domain.repository;

import com.selfintro.modules.skill.domain.entity.*;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SkillRepository extends JpaRepository<Skill, Long> {
    Optional<Skill> findByName(String name);

    List<Skill> findAllByOrderByDisplayOrderAsc();

    List<Skill> findAllByIsCoreTrueOrderByDisplayOrderAsc();
}
