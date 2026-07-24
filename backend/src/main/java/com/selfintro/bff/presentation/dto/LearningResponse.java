package com.selfintro.bff.presentation.dto;

import com.selfintro.modules.study.presentation.dto.StudyResponse;
import java.util.List;

public record LearningResponse(List<StudyResponse> studies) {}
