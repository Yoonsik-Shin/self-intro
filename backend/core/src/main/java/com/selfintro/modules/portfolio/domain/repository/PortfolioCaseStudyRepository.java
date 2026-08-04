package com.selfintro.modules.portfolio.domain.repository;

import com.selfintro.modules.portfolio.domain.entity.PortfolioCaseStudy;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PortfolioCaseStudyRepository extends JpaRepository<PortfolioCaseStudy, Long> {
    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    Optional<PortfolioCaseStudy> findBySlug(String slug);

    Optional<PortfolioCaseStudy> findBySlugAndStatus(String slug, String status);

    List<PortfolioCaseStudy> findAllByOrderByUpdatedAtDesc();

    List<PortfolioCaseStudy> findAllByStatusOrderByUpdatedAtDesc(String status);

    List<PortfolioCaseStudy> findAllByExperienceIdOrderByCreatedAtDesc(Long experienceId);
}
