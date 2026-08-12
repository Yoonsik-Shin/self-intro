package com.selfintro.modules.identity.domain;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {
    Optional<Workspace> findBySlug(String slug);

    Optional<Workspace> findBySlugAndStatus(String slug, WorkspaceStatus status);

    Optional<Workspace> findBySlugAndStatusAndPublicationStatus(
            String slug, WorkspaceStatus status, WorkspacePublicationStatus publicationStatus);

    List<Workspace> findAllByStatusAndPublicationStatus(
            WorkspaceStatus status, WorkspacePublicationStatus publicationStatus);

    List<Workspace> findAllByStatus(WorkspaceStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select workspace from Workspace workspace where workspace.id = :id")
    Optional<Workspace> findByIdForUpdate(@Param("id") Long id);
}
