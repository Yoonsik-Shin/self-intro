package com.selfintro.modules.architecture.domain.repository;

import com.selfintro.modules.architecture.domain.entity.*;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ArchitectureOverviewRepository extends JpaRepository<ArchitectureOverview, Long> {

    @Query("SELECT o FROM ArchitectureOverview o ORDER BY o.id ASC LIMIT 1")
    Optional<ArchitectureOverview> findFirstOverview();
}
