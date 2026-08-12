package com.selfintro.modules.supportaccess.domain;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface SupportAccessRequestRepository extends JpaRepository<SupportAccessRequest, Long> {

    @EntityGraph(attributePaths = {"workspace", "operator", "approvedBy", "deniedBy", "revokedBy"})
    List<SupportAccessRequest> findAllByOperatorIdOrderByRequestedAtDesc(Long operatorUserId);

    @EntityGraph(attributePaths = {"workspace", "operator", "approvedBy", "deniedBy", "revokedBy"})
    List<SupportAccessRequest> findAllByWorkspaceIdOrderByRequestedAtDesc(Long workspaceId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"workspace", "operator", "approvedBy", "deniedBy", "revokedBy"})
    Optional<SupportAccessRequest> findByIdAndWorkspaceId(Long id, Long workspaceId);

    @EntityGraph(attributePaths = {"workspace", "operator", "approvedBy", "deniedBy", "revokedBy"})
    List<SupportAccessRequest> findAllByOperatorIdAndWorkspaceIdAndStatusOrderByApprovedAtDesc(
            Long operatorUserId, Long workspaceId, SupportAccessStatus status);
}
