package com.selfintro.modules.study.domain.repository;

import com.selfintro.modules.study.domain.entity.*;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudyRepository extends JpaRepository<Study, Long>, StudyRepositoryCustom {
    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    Optional<Study> findBySlug(String slug);

    List<Study> findAllByExperiences_IdOrderByTitleAsc(Long experienceId);
}
