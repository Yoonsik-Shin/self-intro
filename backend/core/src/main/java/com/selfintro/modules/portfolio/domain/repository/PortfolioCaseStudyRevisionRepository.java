package com.selfintro.modules.portfolio.domain.repository;

import com.selfintro.modules.portfolio.domain.entity.PortfolioCaseStudyRevision;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PortfolioCaseStudyRevisionRepository
        extends JpaRepository<PortfolioCaseStudyRevision, Long> {
    List<PortfolioCaseStudyRevision> findAllByCaseStudyIdOrderByVersionDesc(Long caseStudyId);

    Optional<PortfolioCaseStudyRevision> findByCaseStudyIdAndVersion(
            Long caseStudyId, int version);

    long countByCaseStudyId(Long caseStudyId);
}
