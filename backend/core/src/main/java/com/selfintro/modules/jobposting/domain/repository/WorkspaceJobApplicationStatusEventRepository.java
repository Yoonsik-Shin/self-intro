package com.selfintro.modules.jobposting.domain.repository;

import com.selfintro.modules.jobposting.domain.entity.WorkspaceJobApplicationStatusEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceJobApplicationStatusEventRepository
        extends JpaRepository<WorkspaceJobApplicationStatusEvent, Long> {

    List<WorkspaceJobApplicationStatusEvent> findAllByWorkspaceJobApplicationIdOrderByChangedAtAsc(
            Long workspaceJobApplicationId);
}
