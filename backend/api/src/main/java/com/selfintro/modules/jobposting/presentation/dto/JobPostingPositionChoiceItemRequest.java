package com.selfintro.modules.jobposting.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

/** rank는 2 이상만 받는다 — 1지망은 job_posting.position_title이 계속 담당한다. */
public record JobPostingPositionChoiceItemRequest(
        @Positive(message = "지망 순위는 2 이상이어야 합니다.") int rank,
        @NotBlank(message = "직무명을 입력해주세요.") String positionTitle) {}
