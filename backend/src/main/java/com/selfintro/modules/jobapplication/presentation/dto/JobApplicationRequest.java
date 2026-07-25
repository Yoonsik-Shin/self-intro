package com.selfintro.modules.jobapplication.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record JobApplicationRequest(
        @NotBlank String companyName,
        @NotBlank String positionTitle,
        String postingUrl,
        @NotBlank String source,
        @NotNull LocalDate appliedAt,
        LocalDate deadline,
        String salaryNote,
        String memo,
        String jobDescription,
        String requiredQualifications,
        String preferredQualifications,
        String hiringProcess,
        String applicationMethod,
        String compensationDetail) {}
