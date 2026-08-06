package com.selfintro.jobposting.presentation.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/**
 * 다중 일괄 수집의 한 행. url만 있으면 기존과 동일한 URL 자동수집이고, images가 있으면
 * (url이 같이 있어도) 그 행은 스크린샷 등록으로 처리한다 — url은 "원본 보기" 링크로만 쓰인다
 * (단일 공고 등록의 스크린샷+URL 조합과 동일한 원칙).
 */
public record JobPostingBulkIngestRequest(@NotEmpty List<Row> rows) {

    public record Row(String url, List<JobPostingImageIngestRequest.ImageRef> images) {
        public boolean hasImages() {
            return images != null && !images.isEmpty();
        }
    }
}
