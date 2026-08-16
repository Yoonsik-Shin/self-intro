package com.selfintro.modules.jobposting.presentation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record JobPostingCoverLetterSaveRequest(
        @NotNull @Valid List<JobPostingCoverLetterItemRequest> items) {}
