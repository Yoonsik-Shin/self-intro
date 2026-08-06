package com.selfintro.modules.jobposting.presentation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record JobPostingPositionChoiceSaveRequest(
        @NotNull @Valid List<JobPostingPositionChoiceItemRequest> choices) {}
