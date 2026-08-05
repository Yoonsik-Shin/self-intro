package com.selfintro.studyplan.presentation.dto;

import com.selfintro.studyplan.domain.entity.StudyPlanCheckQuestion;

public record StudyPlanCheckQuestionResponse(Long id, String question, String modelAnswerHint) {
    public static StudyPlanCheckQuestionResponse from(StudyPlanCheckQuestion question) {
        return new StudyPlanCheckQuestionResponse(
                question.getId(), question.getQuestion(), question.getModelAnswerHint());
    }
}
