package com.selfintro.modules.skill.domain.repository;

import com.selfintro.modules.skill.domain.entity.WorkspaceSkill;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceSkillRepository extends JpaRepository<WorkspaceSkill, Long> {
    @EntityGraph(attributePaths = "skill")
    List<WorkspaceSkill> findAllByWorkspaceIdOrderByDisplayOrderAsc(Long workspaceId);

    @EntityGraph(attributePaths = "skill")
    List<WorkspaceSkill> findAllByWorkspaceIdAndCoreTrueOrderByDisplayOrderAsc(Long workspaceId);

    @EntityGraph(attributePaths = "skill")
    List<WorkspaceSkill> findAllByWorkspaceIdAndSkill_IdIn(
            Long workspaceId, Collection<Long> skillIds);

    long countByWorkspaceId(Long workspaceId);

    Optional<WorkspaceSkill> findByIdAndWorkspaceId(Long id, Long workspaceId);

    Optional<WorkspaceSkill> findByWorkspaceIdAndSkillId(Long workspaceId, Long skillId);
}
