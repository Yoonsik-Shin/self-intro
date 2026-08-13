package com.selfintro.modules.experience.domain.repository;

import com.selfintro.modules.experience.domain.entity.*;
import com.selfintro.modules.experience.domain.enums.*;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExperienceDetailRepository extends JpaRepository<ExperienceDetail, Long> {

    Optional<ExperienceDetail> findByIdAndExperience_WorkspaceId(Long id, Long workspaceId);

    List<ExperienceDetail> findAllByExperience_WorkspaceIdAndIdIn(
            Long workspaceId, Collection<Long> ids);

    List<ExperienceDetail> findAllByExperience_WorkspaceId(Long workspaceId);
}
