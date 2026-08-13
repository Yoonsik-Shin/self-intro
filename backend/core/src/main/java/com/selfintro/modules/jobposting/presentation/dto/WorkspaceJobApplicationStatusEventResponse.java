package com.selfintro.modules.jobposting.presentation.dto;

import com.selfintro.modules.jobposting.domain.entity.WorkspaceJobApplicationStatusEvent;
import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import java.time.LocalDateTime;

public record WorkspaceJobApplicationStatusEventResponse(
        Long id, JobPostingStatus status, String memo, LocalDateTime changedAt) {
    public static WorkspaceJobApplicationStatusEventResponse from(
            WorkspaceJobApplicationStatusEvent event) {
        return new WorkspaceJobApplicationStatusEventResponse(
                event.getId(), event.getStatus(), event.getMemo(), event.getChangedAt());
    }
}
