package com.selfintro.modules.jobposting.domain.repository;

import com.selfintro.modules.jobposting.domain.entity.WorkspaceJobApplication;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceJobApplicationRepository
        extends JpaRepository<WorkspaceJobApplication, Long> {

    @EntityGraph(attributePaths = "jobPosting")
    List<WorkspaceJobApplication> findAllByWorkspaceIdOrderByUpdatedAtDesc(Long workspaceId);

    @EntityGraph(attributePaths = "jobPosting")
    Optional<WorkspaceJobApplication> findByWorkspaceIdAndJobPostingId(
            Long workspaceId, Long jobPostingId);

    long countByWorkspaceId(Long workspaceId);

    boolean existsByWorkspaceIdAndJobPostingId(Long workspaceId, Long jobPostingId);
}
