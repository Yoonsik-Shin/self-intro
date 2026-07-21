package com.selfintro.study.repository;

import com.selfintro.study.entity.Tag;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TagRepository extends JpaRepository<Tag, Long> {
    Optional<Tag> findByNameIgnoreCase(String name);

    boolean existsBySlug(String slug);

    List<Tag> findAllByOrderByNameAsc();

    List<Tag> findByNameIn(Collection<String> names);
}
