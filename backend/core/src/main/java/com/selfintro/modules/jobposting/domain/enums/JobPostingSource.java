package com.selfintro.modules.jobposting.domain.enums;

/**
 * 이 공고가 시스템에 어떻게 들어왔는지(수집 방식). 사용자에게 보여주는 자유 텍스트 "출처"(예: "사람인", "직접입력")와는 별개로, 중복 수집 방지·만료 처리 같은 내부
 * 로직이 이 값을 기준으로 동작한다.
 */
public enum JobPostingSource {
    URL_INGEST,
    SARAMIN,
    MANUAL,
    IMAGE_INGEST
}
