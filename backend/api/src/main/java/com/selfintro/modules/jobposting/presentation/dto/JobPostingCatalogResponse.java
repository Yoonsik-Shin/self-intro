package com.selfintro.modules.jobposting.presentation.dto;

import com.selfintro.modules.jobposting.domain.entity.JobPosting;
import java.time.LocalDate;

/**
 * Workspace 사용자가 공통 공고를 탐색할 때 사용하는 최소 공개 메타데이터.
 *
 * <p>수집 방식, 외부 식별자, 원문 본문과 자격 요건은 플랫폼 운영 정보이므로 이 경계를 통해 전달하지 않는다. 사용자는 원본 URL에서 공고 내용을 확인하고,
 * Workspace에는 지원 상태와 개인 메모만 저장한다.
 */
public record JobPostingCatalogResponse(
        Long id,
        String companyName,
        String positionTitle,
        String postingUrl,
        String source,
        LocalDate deadline,
        boolean alwaysOpen,
        String location,
        String employmentType,
        boolean saved) {
    public static JobPostingCatalogResponse from(JobPosting posting, boolean saved) {
        return new JobPostingCatalogResponse(
                posting.getId(),
                posting.getCompanyName(),
                posting.getPositionTitle(),
                posting.getPostingUrl(),
                posting.getSource(),
                posting.getDeadline(),
                posting.isAlwaysOpen(),
                posting.getLocation(),
                posting.getEmploymentType(),
                saved);
    }
}
