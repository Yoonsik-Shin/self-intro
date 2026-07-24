package com.selfintro.modules.experience.presentation.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record DetailStudies(@NotNull Long detailId, List<Long> studyIds) {}
