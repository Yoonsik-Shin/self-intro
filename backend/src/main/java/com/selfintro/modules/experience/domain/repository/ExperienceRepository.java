package com.selfintro.modules.experience.domain.repository;

import com.selfintro.modules.experience.domain.entity.*;
import com.selfintro.modules.experience.domain.enums.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExperienceRepository extends JpaRepository<Experience, Long> {
    List<Experience> findAllByOrderByDisplayOrderAsc();
}
