package com.selfintro.modules.experience.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ExperienceDetailRequest(
        Long id, // null이면 신규 항목, 있으면 기존 항목 in-place 갱신
        @NotBlank @Size(max = 500) String content,
        String situation,
        String actionDetail,
        String outcome,
        String narrative,
        List<Long> skillIds) {}
