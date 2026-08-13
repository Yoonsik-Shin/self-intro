package com.selfintro.modules.identity.publication.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkspacePublicProfileRevisionRepository
        extends JpaRepository<WorkspacePublicProfileRevision, Long> {
    @Query(
            "select coalesce(max(r.revisionNumber), 0) from WorkspacePublicProfileRevision r where r.workspaceId=:workspaceId")
    int maxRevisionNumber(@Param("workspaceId") Long workspaceId);
}
