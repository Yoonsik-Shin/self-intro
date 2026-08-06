package com.selfintro.modules.jobposting.presentation.dto;

import jakarta.validation.constraints.NotBlank;

public record JobPostingCoverLetterDraftRequest(
        @NotBlank(message = "자소서 문항 질문은 필수입니다.") String question,
        Integer characterLimit
) {}
