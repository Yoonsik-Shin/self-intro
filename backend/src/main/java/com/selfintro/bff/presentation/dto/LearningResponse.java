package com.selfintro.bff.presentation.dto;

import com.selfintro.study.dto.StudyResponse;
import java.util.List;

public record LearningResponse(
    List<StudyResponse> studies
) {}
