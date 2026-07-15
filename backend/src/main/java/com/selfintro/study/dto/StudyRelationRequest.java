package com.selfintro.study.dto;

import com.selfintro.study.entity.StudyRelationType;
import jakarta.validation.constraints.NotNull;

public record StudyRelationRequest(
        @NotNull Long studyId,
        @NotNull StudyRelationType type
) {
}
