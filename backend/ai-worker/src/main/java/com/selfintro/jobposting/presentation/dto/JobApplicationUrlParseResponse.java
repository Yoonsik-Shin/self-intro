package com.selfintro.jobposting.presentation.dto;

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
        /**
         * positionTitle(1지망)을 제외한 나머지 모집부문 목록. 한 페이지/이미지에 여러 직무가 나열된 경우에만 채워지고, 자동 저장되지 않는다 — 지망
         * 확정은 사람이 선택해야 한다.
         */
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
