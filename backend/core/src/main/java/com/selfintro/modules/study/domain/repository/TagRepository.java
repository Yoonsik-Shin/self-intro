package com.selfintro.modules.study.domain.repository;

import com.selfintro.modules.study.domain.entity.*;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TagRepository extends JpaRepository<Tag, Long> {
    Optional<Tag> findByWorkspaceIdAndNameIgnoreCase(Long workspaceId, String name);

    boolean existsByWorkspaceIdAndSlug(Long workspaceId, String slug);

    List<Tag> findAllByWorkspaceIdOrderByNameAsc(Long workspaceId);

    List<Tag> findAllByWorkspaceIdAndNameIn(Long workspaceId, Collection<String> names);
}
