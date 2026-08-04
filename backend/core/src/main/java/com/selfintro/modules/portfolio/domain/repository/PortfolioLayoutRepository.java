package com.selfintro.modules.portfolio.domain.repository;

import com.selfintro.modules.portfolio.domain.entity.PortfolioLayout;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PortfolioLayoutRepository extends JpaRepository<PortfolioLayout, Long> {
    List<PortfolioLayout> findAllByCaseStudyIdOrderByUpdatedAtDesc(Long caseStudyId);

    List<PortfolioLayout> findAllByCaseStudyIdAndOrientationOrderByUpdatedAtDesc(
            Long caseStudyId, String orientation);

    Optional<PortfolioLayout> findByCaseStudyIdAndOrientationAndIsDefaultTrue(
            Long caseStudyId, String orientation);
}
