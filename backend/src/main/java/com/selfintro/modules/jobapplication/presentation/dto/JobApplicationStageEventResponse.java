package com.selfintro.modules.jobapplication.presentation.dto;

import com.selfintro.modules.jobapplication.domain.entity.JobApplicationStageEvent;
import com.selfintro.modules.jobapplication.domain.enums.JobApplicationStage;
import java.time.LocalDateTime;

public record JobApplicationStageEventResponse(
        Long id, JobApplicationStage stage, String memo, LocalDateTime changedAt) {

    public static JobApplicationStageEventResponse from(JobApplicationStageEvent entity) {
        return new JobApplicationStageEventResponse(
                entity.getId(), entity.getStage(), entity.getMemo(), entity.getChangedAt());
    }
}
