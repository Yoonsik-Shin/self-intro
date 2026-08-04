package com.selfintro.modules.printtemplate.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** 포트폴리오 케이스스터디 배치 저장 요청 — {@code PrintTemplate}을 document_type=PORTFOLIO로 재사용한다. */
public record PortfolioPrintTemplateRequest(
        @NotBlank String name,
        @NotBlank @Pattern(regexp = "PORTRAIT|LANDSCAPE") String orientation,
        @NotNull String excludedIds,
        @NotNull String sectionOrder,
        @NotNull String sectionGaps,
        String contentOverrides,
        boolean isDefault) {}
