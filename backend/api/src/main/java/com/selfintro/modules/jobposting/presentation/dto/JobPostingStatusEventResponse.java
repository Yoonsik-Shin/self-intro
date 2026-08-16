package com.selfintro.modules.jobposting.presentation.dto;

import com.selfintro.modules.jobposting.domain.entity.JobPostingStatusEvent;
import com.selfintro.modules.jobposting.domain.enums.JobPostingStatus;
import java.time.LocalDateTime;

public record JobPostingStatusEventResponse(
        Long id, JobPostingStatus status, String memo, LocalDateTime changedAt) {

    public static JobPostingStatusEventResponse from(JobPostingStatusEvent entity) {
        return new JobPostingStatusEventResponse(
                entity.getId(), entity.getStatus(), entity.getMemo(), entity.getChangedAt());
    }
}
