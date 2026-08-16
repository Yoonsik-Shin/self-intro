package com.selfintro.modules.learningresource.domain.repository;

import com.selfintro.modules.learningresource.domain.entity.LearningResource;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearningResourceRepository
        extends JpaRepository<LearningResource, Long>, LearningResourceRepositoryCustom {
    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    Optional<LearningResource> findBySlug(String slug);
}
