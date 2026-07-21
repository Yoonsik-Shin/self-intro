package com.selfintro.modules.architecture.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ArchitectureLayerRepository extends JpaRepository<ArchitectureLayer, Long> {
    List<ArchitectureLayer> findAllByOrderByDisplayOrderAsc();

    List<ArchitectureLayer> findAllByVisibleTrueOrderByDisplayOrderAsc();
}
