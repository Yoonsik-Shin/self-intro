package com.selfintro.modules.studyplan.presentation.dto;

import com.selfintro.modules.studyplan.domain.entity.StudyPlanCheckQuestion;

public record StudyPlanCheckQuestionResponse(Long id, String question, String modelAnswerHint) {
    public static StudyPlanCheckQuestionResponse from(StudyPlanCheckQuestion question) {
        return new StudyPlanCheckQuestionResponse(
                question.getId(), question.getQuestion(), question.getModelAnswerHint());
    }
}
