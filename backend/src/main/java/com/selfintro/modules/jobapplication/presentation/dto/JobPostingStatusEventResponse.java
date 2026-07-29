package com.selfintro.modules.jobapplication.presentation.dto;

import com.selfintro.modules.jobapplication.domain.entity.JobPostingStatusEvent;
import com.selfintro.modules.jobapplication.domain.enums.JobPostingStatus;
import java.time.LocalDateTime;

public record JobPostingStatusEventResponse(
        Long id, JobPostingStatus status, String memo, LocalDateTime changedAt) {

    public static JobPostingStatusEventResponse from(JobPostingStatusEvent entity) {
        return new JobPostingStatusEventResponse(
                entity.getId(), entity.getStatus(), entity.getMemo(), entity.getChangedAt());
    }
}
