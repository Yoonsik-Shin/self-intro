package com.selfintro.modules.competency.domain.repository;

import com.selfintro.modules.competency.domain.entity.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompetencyRepository extends JpaRepository<Competency, Long> {
    List<Competency> findAllByOrderByDisplayOrderAsc();

    List<Competency> findAllByVisibleTrueOrderByDisplayOrderAsc();

    List<Competency> findAllByWorkspaceIdOrderByDisplayOrderAsc(Long workspaceId);

    List<Competency> findAllByWorkspaceIdAndVisibleTrueOrderByDisplayOrderAsc(Long workspaceId);

    long countByWorkspaceId(Long workspaceId);

    java.util.Optional<Competency> findByIdAndWorkspaceId(Long id, Long workspaceId);

    List<Competency> findAllByWorkspaceIdAndIdIn(Long workspaceId, java.util.Collection<Long> ids);

    boolean existsByWorkspaceIdAndSkillLinks_Skill_Id(Long workspaceId, Long skillId);
}
