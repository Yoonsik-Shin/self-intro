package com.selfintro.modules.jobapplication.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

/**
 * 수집된 공고 후보의 내용을 사용자가 직접 고칠 때 쓰는 요청. url/source/status/matchScore처럼 다른 흐름(수집·상태전이·AI매칭)이 관리하는 필드는
 * 여기 포함하지 않는다.
 */
public record JobPostingCandidateUpdateRequest(
        @NotBlank String title,
        @NotBlank String companyName,
        LocalDate deadline,
        String salaryNote,
        String location,
        String employmentType,
        String jobDescription,
        String requiredQualifications,
        String preferredQualifications,
        String hiringProcess,
        String applicationMethod,
        String compensationDetail) {}
