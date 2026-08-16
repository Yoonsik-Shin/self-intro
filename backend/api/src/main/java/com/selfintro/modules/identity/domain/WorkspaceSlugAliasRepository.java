package com.selfintro.modules.identity.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceSlugAliasRepository extends JpaRepository<WorkspaceSlugAlias, Long> {
    Optional<WorkspaceSlugAlias> findBySlugAndRetiredAtIsNull(String slug);

    Optional<WorkspaceSlugAlias> findByWorkspaceIdAndAliasTypeAndRetiredAtIsNull(
            Long workspaceId, WorkspaceSlugAliasType aliasType);

    List<WorkspaceSlugAlias> findAllByWorkspaceIdAndRetiredAtIsNullOrderByCreatedAtDesc(
            Long workspaceId);
}
