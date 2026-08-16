package com.selfintro.modules.taxonomy.domain.repository;

import com.selfintro.modules.taxonomy.domain.entity.WorkspaceTaxonomySchemeSubscription;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceTaxonomySchemeSubscriptionRepository
        extends JpaRepository<WorkspaceTaxonomySchemeSubscription, Long> {

    boolean existsByWorkspaceIdAndSchemeId(Long workspaceId, Long schemeId);

    void deleteAllByWorkspaceId(Long workspaceId);

    @EntityGraph(attributePaths = "scheme")
    List<WorkspaceTaxonomySchemeSubscription>
            findAllByWorkspaceIdAndEnabledTrueOrderByDisplayOrderAscIdAsc(Long workspaceId);
}
