package com.selfintro.modules.identity.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspacePurgeCheckpointRepository
        extends JpaRepository<WorkspacePurgeCheckpoint, Long> {
    List<WorkspacePurgeCheckpoint> findAllByPurgeJobIdOrderByStoreTypeAsc(Long purgeJobId);

    Optional<WorkspacePurgeCheckpoint> findByPurgeJobIdAndStoreType(
            Long purgeJobId, WorkspacePurgeStore storeType);
}
