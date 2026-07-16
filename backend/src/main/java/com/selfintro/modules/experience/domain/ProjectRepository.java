package com.selfintro.modules.experience.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findAllByCareerIdOrderByDisplayOrderAsc(Long careerId);
    boolean existsByCareerId(Long careerId);
}
