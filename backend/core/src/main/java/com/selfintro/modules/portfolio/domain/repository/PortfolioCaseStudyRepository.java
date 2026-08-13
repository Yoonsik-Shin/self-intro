package com.selfintro.modules.portfolio.domain.repository;

import com.selfintro.modules.portfolio.domain.entity.PortfolioCaseStudy;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PortfolioCaseStudyRepository extends JpaRepository<PortfolioCaseStudy, Long> {
    boolean existsByWorkspaceIdAndSlug(Long workspaceId, String slug);

    boolean existsByWorkspaceIdAndSlugAndIdNot(Long workspaceId, String slug, Long id);

    Optional<PortfolioCaseStudy> findByIdAndWorkspaceId(Long id, Long workspaceId);

    Optional<PortfolioCaseStudy> findByWorkspaceIdAndSlugAndStatus(
            Long workspaceId, String slug, String status);

    List<PortfolioCaseStudy> findAllByWorkspaceIdOrderByUpdatedAtDesc(Long workspaceId);

    List<PortfolioCaseStudy> findAllByWorkspaceIdAndStatusOrderByUpdatedAtDesc(
            Long workspaceId, String status);

    List<PortfolioCaseStudy> findAllByWorkspaceIdAndExperienceIdOrderByCreatedAtDesc(
            Long workspaceId, Long experienceId);
}
