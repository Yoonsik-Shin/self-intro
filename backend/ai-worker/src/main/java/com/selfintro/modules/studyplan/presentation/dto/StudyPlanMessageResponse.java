package com.selfintro.modules.studyplan.presentation.dto;

import com.selfintro.modules.studyplan.domain.entity.StudyPlanMessage;
import com.selfintro.modules.studyplan.domain.enums.StudyPlanMessageRole;
import java.time.LocalDateTime;

public record StudyPlanMessageResponse(
        Long id, StudyPlanMessageRole role, String content, LocalDateTime createdAt) {

    public static StudyPlanMessageResponse from(StudyPlanMessage message) {
        return new StudyPlanMessageResponse(
                message.getId(), message.getRole(), message.getContent(), message.getCreatedAt());
    }
}
