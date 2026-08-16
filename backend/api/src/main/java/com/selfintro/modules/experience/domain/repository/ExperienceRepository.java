package com.selfintro.modules.experience.domain.repository;

import com.selfintro.modules.experience.domain.entity.*;
import com.selfintro.modules.experience.domain.enums.*;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ExperienceRepository extends JpaRepository<Experience, Long> {
    List<Experience> findAllByOrderByDisplayOrderAsc();

    List<Experience> findAllByWorkspaceIdOrderByDisplayOrderAsc(Long workspaceId);

    List<Experience> findAllByWorkspaceIdAndIdIn(Long workspaceId, Collection<Long> ids);

    Optional<Experience> findByIdAndWorkspaceId(Long id, Long workspaceId);

    @Query("select e.workspaceId as workspaceId, e.id as experienceId from Experience e")
    List<ExperienceSourceReference> findAllSourceReferences();

    boolean existsByWorkspaceIdAndSkills_Id(Long workspaceId, Long skillId);

    boolean existsByWorkspaceIdAndDetails_Skills_Id(Long workspaceId, Long skillId);

    interface ExperienceSourceReference {
        Long getWorkspaceId();

        Long getExperienceId();
    }
}
