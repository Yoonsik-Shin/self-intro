package com.selfintro.modules.jobposting.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * 채용 공고를 수동으로 등록하거나(이미 지원 완료한 건을 바로 기록) 편집할 때 쓰는 요청. 지원 전/후 어느 단계든 동일한 형태로 편집하며, 상태 전이(저장/제외/지원
 * 전환/전형 단계 변경)는 별도 엔드포인트가 담당하므로 여기 포함하지 않는다. {@code appliedAt}은 신규 등록 시에만 의미가 있고, 편집 요청에서는 무시된다.
 */
public record JobPostingRequest(
        @NotBlank String companyName,
        @NotBlank String positionTitle,
        String postingUrl,
        @NotBlank String source,
        LocalDate appliedAt,
        LocalDate deadline,
        LocalTime deadlineTime,
        boolean alwaysOpen,
        String salaryNote,
        String location,
        String employmentType,
        String memo,
        String jobDescription,
        String requiredQualifications,
        String preferredQualifications,
        String hiringProcess,
        String applicationMethod,
        String compensationDetail) {}
