package com.selfintro.modules.identity.domain;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, Long> {
    long countByStatus(MembershipStatus status);

    @EntityGraph(attributePaths = "workspace")
    List<WorkspaceMember> findAllByUserIdAndStatus(Long userId, MembershipStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = "workspace")
    @Query(
            "select member from WorkspaceMember member where member.user.id = :userId and member.status = :status")
    List<WorkspaceMember> findAllByUserIdAndStatusForUpdate(
            @Param("userId") Long userId, @Param("status") MembershipStatus status);

    @EntityGraph(attributePaths = {"workspace", "user"})
    Optional<WorkspaceMember> findByWorkspaceIdAndUserIdAndStatus(
            Long workspaceId, Long userId, MembershipStatus status);

    @EntityGraph(attributePaths = "user")
    List<WorkspaceMember> findAllByWorkspaceIdAndStatusOrderByJoinedAtAsc(
            Long workspaceId, MembershipStatus status);

    @EntityGraph(attributePaths = "user")
    Optional<WorkspaceMember> findByIdAndWorkspaceId(Long id, Long workspaceId);

    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(Long workspaceId, Long userId);

    long countByWorkspaceIdAndStatusAndRole(
            Long workspaceId, MembershipStatus status, WorkspaceRole role);
}
