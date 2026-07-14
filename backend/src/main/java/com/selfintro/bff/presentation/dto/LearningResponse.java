package com.selfintro.bff.presentation.dto;

import com.selfintro.study.dto.StudyEntryResponse;
import java.util.List;

public record LearningResponse(
    List<StudyEntryResponse> studyEntries
) {}
