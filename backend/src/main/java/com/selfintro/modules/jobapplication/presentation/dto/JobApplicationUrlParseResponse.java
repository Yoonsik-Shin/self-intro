package com.selfintro.modules.jobapplication.presentation.dto;

import java.time.LocalDate;

public record JobApplicationUrlParseResponse(
        String companyName,
        String positionTitle,
        String source,
        LocalDate deadline,
        boolean alwaysOpen,
        String salaryNote,
        String location,
        String employmentType,
        String jobDescription,
        String requiredQualifications,
        String preferredQualifications,
        String hiringProcess,
        String applicationMethod,
        String compensationDetail,
        String postingUrl) {}
