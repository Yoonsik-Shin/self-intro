package com.selfintro.modules.identity.publication.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkspacePublicationRevisionRepository
        extends JpaRepository<WorkspacePublicationRevision, Long> {
    Optional<WorkspacePublicationRevision> findTopByWorkspaceIdOrderByRevisionNumberDesc(
            Long workspaceId);

    Optional<WorkspacePublicationRevision> findByWorkspaceIdAndRevisionNumber(
            Long workspaceId, int revisionNumber);

    List<WorkspacePublicationRevision> findAllByWorkspaceIdOrderByRevisionNumberDesc(
            Long workspaceId);

    @Query(
            "select coalesce(max(revision.revisionNumber), 0) "
                    + "from WorkspacePublicationRevision revision "
                    + "where revision.workspaceId = :workspaceId")
    int maxRevisionNumber(@Param("workspaceId") Long workspaceId);
}
