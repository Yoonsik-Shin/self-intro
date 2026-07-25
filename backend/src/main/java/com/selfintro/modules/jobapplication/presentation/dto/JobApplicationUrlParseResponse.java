package com.selfintro.modules.jobapplication.presentation.dto;

import java.time.LocalDate;

public record JobApplicationUrlParseResponse(
        String companyName,
        String positionTitle,
        String source,
        LocalDate deadline,
        String salaryNote,
        String jobDescription,
        String requiredQualifications,
        String preferredQualifications,
        String hiringProcess,
        String applicationMethod,
        String compensationDetail,
        String postingUrl) {}
