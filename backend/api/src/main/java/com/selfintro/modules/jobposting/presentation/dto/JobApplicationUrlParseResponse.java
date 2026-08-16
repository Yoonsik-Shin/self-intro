package com.selfintro.modules.jobposting.presentation.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record JobApplicationUrlParseResponse(
        String companyName,
        String positionTitle,
        String source,
        LocalDate deadline,
        LocalTime deadlineTime,
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
        String postingUrl,
        List<String> additionalPositionTitles) {

    public JobApplicationUrlParseResponse {
        additionalPositionTitles =
                additionalPositionTitles == null ? List.of() : additionalPositionTitles;
    }

    public JobApplicationUrlParseResponse(
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
            String postingUrl,
            List<String> additionalPositionTitles) {
        this(
                companyName,
                positionTitle,
                source,
                deadline,
                null,
                alwaysOpen,
                salaryNote,
                location,
                employmentType,
                jobDescription,
                requiredQualifications,
                preferredQualifications,
                hiringProcess,
                applicationMethod,
                compensationDetail,
                postingUrl,
                additionalPositionTitles);
    }
}
