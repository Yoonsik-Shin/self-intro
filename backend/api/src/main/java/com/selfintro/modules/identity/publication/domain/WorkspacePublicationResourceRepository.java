package com.selfintro.modules.identity.publication.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkspacePublicationResourceRepository
        extends JpaRepository<WorkspacePublicationResource, Long> {
    Optional<WorkspacePublicationResource> findByRevisionIdAndResourceTypeAndResourceKey(
            Long revisionId, PublicationResourceType resourceType, String resourceKey);

    List<WorkspacePublicationResource> findAllByRevisionIdAndResourceTypeOrderByIdAsc(
            Long revisionId, PublicationResourceType resourceType);

    List<WorkspacePublicationResource> findAllByRevisionIdOrderByIdAsc(Long revisionId);

    @Modifying
    @Query(
            "delete from WorkspacePublicationResource resource where resource.revisionId in :revisionIds")
    void deleteAllByRevisionIds(@Param("revisionIds") List<Long> revisionIds);
}
