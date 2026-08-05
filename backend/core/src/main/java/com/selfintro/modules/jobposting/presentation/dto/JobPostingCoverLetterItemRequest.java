package com.selfintro.modules.jobposting.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record JobPostingCoverLetterItemRequest(
        @NotBlank(message = "자소서 문항을 입력해주세요.") String question,
        @NotNull String answer,
        @Positive(message = "글자 수 제한은 1 이상이어야 합니다.") Integer characterLimit) {}
