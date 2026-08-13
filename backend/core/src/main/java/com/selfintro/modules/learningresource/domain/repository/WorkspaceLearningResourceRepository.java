package com.selfintro.modules.learningresource.domain.repository;

import com.selfintro.modules.learningresource.domain.entity.WorkspaceLearningResource;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceLearningResourceRepository
        extends JpaRepository<WorkspaceLearningResource, Long> {

    @EntityGraph(attributePaths = {"learningResource", "tags"})
    List<WorkspaceLearningResource> findAllByWorkspaceIdOrderByDisplayOrderAscIdDesc(
            Long workspaceId);

    @EntityGraph(attributePaths = {"learningResource", "tags"})
    Optional<WorkspaceLearningResource> findByWorkspaceIdAndLearningResourceId(
            Long workspaceId, Long learningResourceId);

    boolean existsByWorkspaceIdAndLearningResourceId(Long workspaceId, Long learningResourceId);

    void deleteAllByLearningResourceId(Long learningResourceId);
}
